import { DelayGate } from '../../../../../src/Contexts/shared/application/consumers/index.js';
import { buildRetryConfig } from './retryConfig.fixture.js';

describe('DelayGate', () => {
  const gate = new DelayGate({ retry: buildRetryConfig() });

  it('defers a retry.5s message whose delay has not elapsed', () => {
    const enqueuedAt = new Date('2026-11-17T10:00:00.000Z');
    const now = new Date('2026-11-17T10:00:02.000Z');

    expect(
      gate.evaluate('agro.domain.events.retry.5s', enqueuedAt, now)
    ).toEqual({ kind: 'defer', remainingMs: 3000 });
  });

  it('proceeds once the retry.5s delay has elapsed', () => {
    const enqueuedAt = new Date('2026-11-17T10:00:00.000Z');
    const now = new Date('2026-11-17T10:00:06.000Z');

    expect(
      gate.evaluate('agro.domain.events.retry.5s', enqueuedAt, now)
    ).toEqual({ kind: 'proceed' });
  });

  it('never gates a main-topic message', () => {
    expect(gate.evaluate('agro.domain.events', undefined, new Date())).toEqual({
      kind: 'proceed'
    });
  });

  it('proceeds instead of deferring forever when a retry message lacks an enqueued-at', () => {
    expect(
      gate.evaluate('agro.domain.events.retry.5s', undefined, new Date())
    ).toEqual({ kind: 'proceed' });
  });
});
