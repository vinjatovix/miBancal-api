import {
  LAST_ERROR_MAX_LENGTH,
  RETRY_HEADER,
  RetryContext
} from '../../../../../src/Contexts/shared/application/consumers/index.js';
import { buildRetryConfig } from './retryConfig.fixture.js';

const RETRY_TOPIC = 'agro.domain.events.retry.5s';
const MAIN_TOPIC = 'agro.domain.events';

describe('RetryContext', () => {
  const context = new RetryContext({ retry: buildRetryConfig() });

  it('round-trips retry headers and reads them back', () => {
    const now = new Date('2026-11-17T10:00:00.000Z');
    const firstFailedAt = new Date('2026-11-17T09:59:00.000Z');

    const headers = context.buildRetryHeaders({
      attempt: 2,
      firstFailedAt,
      lastError: 'InvalidArgumentException: bad plant id',
      failingConsumers: ['plant-likes-counter', 'other-consumer'],
      now
    });

    expect(headers[RETRY_HEADER.attempt]).toBe('2');
    expect(headers[RETRY_HEADER.enqueuedAt]).toBe('2026-11-17T10:00:00.000Z');
    expect(headers[RETRY_HEADER.firstFailedAt]).toBe(
      '2026-11-17T09:59:00.000Z'
    );
    expect(headers[RETRY_HEADER.failingConsumers]).toBe(
      'plant-likes-counter,other-consumer'
    );
    expect(context.readAttempt(RETRY_TOPIC, headers)).toEqual({
      kind: 'valid',
      attempt: 2
    });
    expect(context.readEnqueuedAt(headers)).toEqual(now);
    expect(context.readFirstFailedAt(headers)).toEqual(firstFailedAt);
  });

  it('defaults first-failed-at to now when absent', () => {
    const now = new Date('2026-11-17T10:00:00.000Z');

    const headers = context.buildRetryHeaders({
      attempt: 1,
      firstFailedAt: undefined,
      lastError: 'Error: boom',
      failingConsumers: [],
      now
    });

    expect(headers[RETRY_HEADER.firstFailedAt]).toBe(
      '2026-11-17T10:00:00.000Z'
    );
  });

  it('truncates the last-error summary to the documented cap', () => {
    const headers = context.buildRetryHeaders({
      attempt: 1,
      firstFailedAt: undefined,
      lastError: 'E'.repeat(LAST_ERROR_MAX_LENGTH + 200),
      failingConsumers: [],
      now: new Date()
    });

    expect(headers[RETRY_HEADER.lastError]).toHaveLength(LAST_ERROR_MAX_LENGTH);
  });

  describe('readAttempt guard', () => {
    it('absent attempt header on a retry topic is corrupt', () => {
      expect(context.readAttempt(RETRY_TOPIC, {})).toEqual({ kind: 'corrupt' });
    });

    it('non-numeric attempt header is corrupt', () => {
      expect(
        context.readAttempt(RETRY_TOPIC, {
          [RETRY_HEADER.attempt]: Buffer.from('abc')
        })
      ).toEqual({ kind: 'corrupt' });
    });

    it('zero or negative attempt header is corrupt', () => {
      expect(
        context.readAttempt(RETRY_TOPIC, {
          [RETRY_HEADER.attempt]: Buffer.from('0')
        })
      ).toEqual({ kind: 'corrupt' });
      expect(
        context.readAttempt(RETRY_TOPIC, {
          [RETRY_HEADER.attempt]: Buffer.from('-1')
        })
      ).toEqual({ kind: 'corrupt' });
    });

    it('an attempt greater than maxRetries is corrupt', () => {
      expect(
        context.readAttempt(RETRY_TOPIC, {
          [RETRY_HEADER.attempt]: Buffer.from('4')
        })
      ).toEqual({ kind: 'corrupt' });
    });

    it('a main-topic message is a fresh attempt 0', () => {
      expect(context.readAttempt(MAIN_TOPIC, {})).toEqual({
        kind: 'fresh',
        attempt: 0
      });
    });
  });
});
