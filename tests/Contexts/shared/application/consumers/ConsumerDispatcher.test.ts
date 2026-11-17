import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import { ConsumerDispatcher } from '../../../../../src/Contexts/shared/application/consumers/index.js';
import type { KafkaDomainEventEnvelope } from '../../../../../src/Contexts/shared/domain/events/index.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/index.js';

type FakeConsumer = {
  name: string;
  eventNames: ReadonlySet<string>;
  handle: jest.Mock<Promise<void>, [KafkaDomainEventEnvelope]>;
};

const buildEnvelope = (
  eventName: string,
  eventId: string = uuidv7()
): KafkaDomainEventEnvelope => {
  const plantId = uuidv4();
  return {
    eventId,
    eventName,
    aggregateId: plantId,
    occurredAt: new Date().toISOString(),
    payload: { plantId }
  };
};

const buildConsumer = (
  name: string,
  eventNames: readonly string[],
  handleImpl: () => Promise<void> = () => Promise.resolve()
): FakeConsumer => ({
  name,
  eventNames: new Set(eventNames),
  handle: jest.fn<Promise<void>, [KafkaDomainEventEnvelope]>(handleImpl)
});

const buildLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

describe('ConsumerDispatcher', () => {
  it('invokes only the consumer that declares the event name', async () => {
    const consumerA = buildConsumer('consumer-a', ['A']);
    const consumerB = buildConsumer('consumer-b', ['B']);
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger: buildLogger()
    });

    await dispatcher.dispatch(buildEnvelope('A'));

    expect(consumerA.handle).toHaveBeenCalledTimes(1);
    expect(consumerB.handle).not.toHaveBeenCalled();
  });

  it('invokes every consumer that declares the event name exactly once', async () => {
    const consumerA = buildConsumer('consumer-a', ['A']);
    const consumerB = buildConsumer('consumer-b', ['A']);
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger: buildLogger()
    });

    await dispatcher.dispatch(buildEnvelope('A'));

    expect(consumerA.handle).toHaveBeenCalledTimes(1);
    expect(consumerB.handle).toHaveBeenCalledTimes(1);
  });

  it('runs no consumer and resolves when the event is declared by none', async () => {
    const consumerA = buildConsumer('consumer-a', ['A']);
    const consumerB = buildConsumer('consumer-b', ['B']);
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger: buildLogger()
    });

    await expect(
      dispatcher.dispatch(buildEnvelope('Z'))
    ).resolves.toBeUndefined();

    expect(consumerA.handle).not.toHaveBeenCalled();
    expect(consumerB.handle).not.toHaveBeenCalled();
  });

  it('resolves when every matching consumer succeeds', async () => {
    const consumerA = buildConsumer('consumer-a', ['A']);
    const consumerB = buildConsumer('consumer-b', ['A']);
    const logger = buildLogger();
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger
    });

    await expect(
      dispatcher.dispatch(buildEnvelope('A'))
    ).resolves.toBeUndefined();

    expect(consumerA.handle).toHaveBeenCalledTimes(1);
    expect(consumerB.handle).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('runs all matching consumers without fail-fast and throws an aggregated error', async () => {
    const failure = new Error('consumer-a exploded');
    const consumerA = buildConsumer('consumer-a', ['A'], () =>
      Promise.reject(failure)
    );
    const consumerB = buildConsumer('consumer-b', ['A']);
    const logger = buildLogger();
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger
    });
    const envelope = buildEnvelope('A');

    await expect(dispatcher.dispatch(envelope)).rejects.toBeInstanceOf(
      AggregateError
    );

    expect(consumerA.handle).toHaveBeenCalledTimes(1);
    expect(consumerB.handle).toHaveBeenCalledTimes(1);
  });

  it('emits exactly one error log per failing consumer and none for succeeding consumers', async () => {
    const failure = new Error('consumer-a exploded');
    const consumerA = buildConsumer('consumer-a', ['A'], () =>
      Promise.reject(failure)
    );
    const consumerB = buildConsumer('consumer-b', ['A']);
    const logger = buildLogger();
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger
    });
    const envelope = buildEnvelope('A');

    await expect(dispatcher.dispatch(envelope)).rejects.toBeInstanceOf(
      AggregateError
    );

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      failure,
      expect.objectContaining({
        consumer: 'consumer-a',
        eventId: envelope.eventId,
        eventName: envelope.eventName
      })
    );
  });

  it('carries each thrown cause inside the aggregated error', async () => {
    const failureA = new Error('consumer-a exploded');
    const failureB = new Error('consumer-b exploded');
    const consumerA = buildConsumer('consumer-a', ['A'], () =>
      Promise.reject(failureA)
    );
    const consumerB = buildConsumer('consumer-b', ['A'], () =>
      Promise.reject(failureB)
    );
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger: buildLogger()
    });

    let thrownError: unknown;
    try {
      await dispatcher.dispatch(buildEnvelope('A'));
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(AggregateError);
    expect((thrownError as AggregateError).errors).toEqual([
      failureA,
      failureB
    ]);
  });

  it('aggregates and rethrows even when a consumer rejects with a falsy value', async () => {
    const consumerA = buildConsumer('consumer-a', ['A']);
    consumerA.handle.mockRejectedValue(undefined);
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA],
      logger: buildLogger()
    });

    await expect(
      dispatcher.dispatch(buildEnvelope('A'))
    ).rejects.toBeInstanceOf(AggregateError);
  });

  it('preserves per-consumer idempotence under fan-out and redelivery', async () => {
    const processedEventIds = new Set<string>();
    let consumerASideEffectCount = 0;
    let consumerBAttempts = 0;
    let consumerBSideEffectCount = 0;

    const consumerA: FakeConsumer = {
      name: 'consumer-a',
      eventNames: new Set(['A']),
      handle: jest.fn((envelope: KafkaDomainEventEnvelope): Promise<void> => {
        if (processedEventIds.has(envelope.eventId)) {
          return Promise.resolve();
        }
        processedEventIds.add(envelope.eventId);
        consumerASideEffectCount += 1;
        return Promise.resolve();
      })
    };

    const consumerB: FakeConsumer = {
      name: 'consumer-b',
      eventNames: new Set(['A']),
      handle: jest.fn((_envelope: KafkaDomainEventEnvelope): Promise<void> => {
        consumerBAttempts += 1;
        if (consumerBAttempts === 1) {
          return Promise.reject(new Error('transient error in consumer-b'));
        }
        consumerBSideEffectCount += 1;
        return Promise.resolve();
      })
    };

    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger: buildLogger()
    });
    const envelope = buildEnvelope('A');

    await expect(dispatcher.dispatch(envelope)).rejects.toBeInstanceOf(
      AggregateError
    );
    expect(consumerASideEffectCount).toBe(1);
    expect(consumerBSideEffectCount).toBe(0);

    await expect(dispatcher.dispatch(envelope)).resolves.toBeUndefined();
    expect(consumerASideEffectCount).toBe(1);
    expect(consumerBSideEffectCount).toBe(1);
    expect(consumerA.handle).toHaveBeenCalledTimes(2);
    expect(consumerB.handle).toHaveBeenCalledTimes(2);
  });
});
