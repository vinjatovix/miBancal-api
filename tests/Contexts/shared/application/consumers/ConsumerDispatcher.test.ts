import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import {
  ConsumerDispatcher,
  ConsumerDispatchFailure
} from '../../../../../src/Contexts/shared/application/consumers/index.js';
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
  it('resolves without throwing when every matching consumer succeeds', async () => {
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

  it('resolves as a no-op when no consumer declares the event name', async () => {
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

  it('throws ConsumerDispatchFailure listing each failing consumer and error in run order', async () => {
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

    let thrown: unknown;
    try {
      await dispatcher.dispatch(buildEnvelope('A'));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConsumerDispatchFailure);
    const failure = thrown as ConsumerDispatchFailure;
    expect(failure.failures).toEqual([
      { consumer: 'consumer-a', error: failureA },
      { consumer: 'consumer-b', error: failureB }
    ]);
    expect(failure.failingConsumers()).toEqual(['consumer-a', 'consumer-b']);
  });

  it('applies only the successful consumer side effect and lists only the failing one', async () => {
    let consumerASideEffects = 0;
    const consumerA = buildConsumer('consumer-a', ['A'], () => {
      consumerASideEffects += 1;
      return Promise.resolve();
    });
    const failureB = new Error('consumer-b exploded');
    const consumerB = buildConsumer('consumer-b', ['A'], () =>
      Promise.reject(failureB)
    );
    const dispatcher = new ConsumerDispatcher({
      consumers: [consumerA, consumerB],
      logger: buildLogger()
    });

    let thrown: unknown;
    try {
      await dispatcher.dispatch(buildEnvelope('A'));
    } catch (error) {
      thrown = error;
    }

    expect(consumerASideEffects).toBe(1);
    const failure = thrown as ConsumerDispatchFailure;
    expect(failure.failures).toEqual([
      { consumer: 'consumer-b', error: failureB }
    ]);
  });

  it('logs exactly one error per failing consumer and none for succeeding consumers', async () => {
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
      ConsumerDispatchFailure
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
      ConsumerDispatchFailure
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
