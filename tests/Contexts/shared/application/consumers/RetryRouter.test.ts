import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import {
  ConsumerDispatchFailure,
  FailureClassifier,
  LAST_ERROR_MAX_LENGTH,
  type MessagePublisher,
  type OutboundMessage,
  RETRY_HEADER,
  RetryContext,
  RetryPolicy,
  RetryRouter
} from '../../../../../src/Contexts/shared/application/consumers/index.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import type { KafkaDomainEventEnvelope } from '../../../../../src/Contexts/shared/domain/events/index.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/index.js';
import { buildRetryConfig } from './retryConfig.fixture.js';

const MAIN_TOPIC = 'agro.domain.events';
const NOW = new Date('2026-11-17T10:00:00.000Z');

const buildEnvelope = (): KafkaDomainEventEnvelope => {
  const plantId = uuidv4();
  return {
    eventId: uuidv7(),
    eventName: 'plant.liked',
    aggregateId: plantId,
    occurredAt: NOW.toISOString(),
    payload: { plantId }
  };
};

const buildHarness = () => {
  const retry = buildRetryConfig();
  const send = jest
    .fn<Promise<void>, [OutboundMessage]>()
    .mockResolvedValue(undefined);
  const ensureTopics = jest
    .fn<Promise<void>, [string[]]>()
    .mockResolvedValue(undefined);
  const messagePublisher: MessagePublisher = { send, ensureTopics };
  const error = jest.fn<void, [string, unknown, Record<string, unknown>?]>();
  const logger: AppLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error
  };
  const router = new RetryRouter({
    messagePublisher,
    retryPolicy: new RetryPolicy({ retry }),
    failureClassifier: new FailureClassifier(),
    retryContext: new RetryContext({ retry }),
    logger
  });
  return { router, send, error };
};

const retryableFailure = (): ConsumerDispatchFailure =>
  new ConsumerDispatchFailure([
    { consumer: 'plant-likes-counter', error: new Error('mongo timeout') }
  ]);

describe('RetryRouter', () => {
  it('republishes a fresh retryable failure to retry.5s with attempt 1 and unchanged value', async () => {
    const { router, send } = buildHarness();
    const envelope = buildEnvelope();
    const value = Buffer.from(JSON.stringify(envelope));

    const outcome = await router.route({
      sourceTopic: MAIN_TOPIC,
      key: envelope.aggregateId,
      value,
      headers: {},
      attempt: 0,
      corrupt: false,
      failure: retryableFailure(),
      envelope,
      now: NOW
    });

    expect(outcome).toEqual({ kind: 'republished' });
    expect(send).toHaveBeenCalledTimes(1);
    const sent = send.mock.calls[0]?.[0];
    expect(sent?.topic).toBe('agro.domain.events.retry.5s');
    expect(sent?.key).toBe(envelope.aggregateId);
    expect(sent?.value).toBe(value);
    expect(sent?.headers[RETRY_HEADER.attempt]).toBe('1');
    expect(sent?.headers[RETRY_HEADER.enqueuedAt]).toBe(NOW.toISOString());
    expect(sent?.headers[RETRY_HEADER.failingConsumers]).toBe(
      'plant-likes-counter'
    );
  });

  it('rethrows when the publish rejects and yields no resolving outcome', async () => {
    const { router, send } = buildHarness();
    send.mockRejectedValueOnce(new Error('broker down'));
    const envelope = buildEnvelope();

    await expect(
      router.route({
        sourceTopic: MAIN_TOPIC,
        key: envelope.aggregateId,
        value: Buffer.from('{}'),
        headers: {},
        attempt: 0,
        corrupt: false,
        failure: retryableFailure(),
        envelope,
        now: NOW
      })
    ).rejects.toThrow('broker down');
  });

  it('dead-letters at maxRetries with metadata and exactly one marker alert', async () => {
    const { router, send, error } = buildHarness();
    const envelope = buildEnvelope();

    const outcome = await router.route({
      sourceTopic: 'agro.domain.events.retry.5m',
      key: envelope.aggregateId,
      value: Buffer.from('{}'),
      headers: {},
      attempt: 3,
      corrupt: false,
      failure: retryableFailure(),
      envelope,
      now: NOW
    });

    expect(outcome).toEqual({ kind: 'dead-lettered' });
    const sent = send.mock.calls[0]?.[0];
    expect(sent?.topic).toBe('agro.domain.events.dlq');
    expect(sent?.headers[RETRY_HEADER.attempt]).toBe('3');
    expect(sent?.headers[RETRY_HEADER.deadLetteredAt]).toBe(NOW.toISOString());
    expect(sent?.headers[RETRY_HEADER.failingConsumers]).toBe(
      'plant-likes-counter'
    );
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      'Domain event dead-lettered',
      undefined,
      expect.objectContaining({
        event: 'domain-event.dead-lettered',
        eventId: envelope.eventId,
        eventName: envelope.eventName,
        attempt: 3,
        failingConsumers: ['plant-likes-counter'],
        deadLetteredAt: NOW.toISOString()
      })
    );
  });

  it('dead-letters an all-non-retryable failure directly without a retry level', async () => {
    const { router, send } = buildHarness();
    const envelope = buildEnvelope();
    const failure = new ConsumerDispatchFailure([
      {
        consumer: 'plant-likes-counter',
        error: new InvalidArgumentException('bad')
      }
    ]);

    const outcome = await router.route({
      sourceTopic: MAIN_TOPIC,
      key: envelope.aggregateId,
      value: Buffer.from('{}'),
      headers: {},
      attempt: 0,
      corrupt: false,
      failure,
      envelope,
      now: NOW
    });

    expect(outcome).toEqual({ kind: 'dead-lettered' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'agro.domain.events.dlq' })
    );
  });

  it('dead-letters a corrupt attempt count', async () => {
    const { router, send, error } = buildHarness();
    const envelope = buildEnvelope();

    const outcome = await router.route({
      sourceTopic: 'agro.domain.events.retry.5s',
      key: envelope.aggregateId,
      value: Buffer.from('{}'),
      headers: {},
      attempt: 0,
      corrupt: true,
      envelope,
      now: NOW
    });

    expect(outcome).toEqual({ kind: 'dead-lettered' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'agro.domain.events.dlq' })
    );
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('caps the last-error summary to error name and short message', async () => {
    const { router, send, error } = buildHarness();
    const envelope = buildEnvelope();
    const failure = new ConsumerDispatchFailure([
      {
        consumer: 'plant-likes-counter',
        error: new InvalidArgumentException('z'.repeat(1000))
      }
    ]);

    await router.route({
      sourceTopic: MAIN_TOPIC,
      key: envelope.aggregateId,
      value: Buffer.from('{}'),
      headers: {},
      attempt: 0,
      corrupt: false,
      failure,
      envelope,
      now: NOW
    });

    const sentHeaders = send.mock.calls[0]?.[0].headers ?? {};
    const lastError = sentHeaders[RETRY_HEADER.lastError] ?? '';
    expect(lastError).toHaveLength(LAST_ERROR_MAX_LENGTH);
    expect(lastError.startsWith('InvalidArgumentException:')).toBe(true);
    const loggedMeta = error.mock.calls[0]?.[2] as {
      lastError: string;
    };
    expect(loggedMeta.lastError).toHaveLength(LAST_ERROR_MAX_LENGTH);
  });
});
