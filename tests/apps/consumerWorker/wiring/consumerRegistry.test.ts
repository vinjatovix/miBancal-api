import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import type {
  ConsumerContainer,
  ConsumerContainerCradle
} from '../../../../src/apps/consumerWorker/wiring/ConsumerContainerCradle.js';
import {
  buildConsumerDispatcher,
  CONSUMER_REGISTRATIONS
} from '../../../../src/apps/consumerWorker/wiring/consumerRegistry.js';
import { ConsumerDispatcher } from '../../../../src/Contexts/shared/application/consumers/index.js';
import type { KafkaDomainEventEnvelope } from '../../../../src/Contexts/shared/domain/events/index.js';
import type { AppLogger } from '../../../../src/Contexts/shared/plugins/index.js';

type FakeConsumer = {
  name: string;
  eventNames: ReadonlySet<string>;
  handle: jest.Mock<Promise<void>, [KafkaDomainEventEnvelope]>;
};

const buildLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const buildConsumer = (
  name: string,
  eventNames: readonly string[]
): FakeConsumer => ({
  name,
  eventNames: new Set(eventNames),
  handle: jest
    .fn<Promise<void>, [KafkaDomainEventEnvelope]>()
    .mockResolvedValue(undefined)
});

const buildEnvelope = (eventName: string): KafkaDomainEventEnvelope => {
  const plantId = uuidv4();
  return {
    eventId: uuidv7(),
    eventName,
    aggregateId: plantId,
    occurredAt: new Date().toISOString(),
    payload: { plantId }
  };
};

const buildContainer = (
  consumersByKey: Record<string, FakeConsumer>,
  logger: AppLogger
): { container: ConsumerContainer; resolve: jest.Mock } => {
  const resolve = jest.fn((key: keyof ConsumerContainerCradle) => {
    if (key === 'logger') return logger;
    return consumersByKey[key as string];
  });
  return { container: { resolve } as unknown as ConsumerContainer, resolve };
};

describe('consumerRegistry', () => {
  it('registers plantLikesCounterConsumer in the consumer registry', () => {
    expect(CONSUMER_REGISTRATIONS).toContain('plantLikesCounterConsumer');
    expect(CONSUMER_REGISTRATIONS).toEqual(['plantLikesCounterConsumer']);
  });

  it('resolves every registered consumer key and the logger from the container into a ConsumerDispatcher', () => {
    const logger = buildLogger();
    const plantLikesConsumer = buildConsumer('plant-likes-counter', [
      'plant.liked',
      'plant.unliked'
    ]);
    const consumersByKey: Record<string, FakeConsumer> = {
      plantLikesCounterConsumer: plantLikesConsumer
    };
    const { container, resolve } = buildContainer(consumersByKey, logger);

    const dispatcher = buildConsumerDispatcher(container);

    expect(dispatcher).toBeInstanceOf(ConsumerDispatcher);
    for (const key of CONSUMER_REGISTRATIONS) {
      expect(resolve).toHaveBeenCalledWith(key);
    }
    expect(resolve).toHaveBeenCalledWith('logger');
  });

  it('builds a dispatcher that routes declared events to registered consumers and ignores undeclared events', async () => {
    const logger = buildLogger();
    const plantLikesConsumer = buildConsumer('plant-likes-counter', [
      'plant.liked',
      'plant.unliked'
    ]);
    const consumersByKey: Record<string, FakeConsumer> = {
      plantLikesCounterConsumer: plantLikesConsumer
    };
    const { container } = buildContainer(consumersByKey, logger);
    const dispatcher = buildConsumerDispatcher(container);

    await dispatcher.dispatch(buildEnvelope('plant.liked'));
    await dispatcher.dispatch(buildEnvelope('unrelated.event'));

    expect(plantLikesConsumer.handle).toHaveBeenCalledTimes(1);
    expect(plantLikesConsumer.handle).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'plant.liked' })
    );
  });
});
