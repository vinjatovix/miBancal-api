import type { EachMessagePayload } from 'kafkajs';
import type { MongoClient } from 'mongodb';
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import { ConsumerWorkerApp } from '../../../src/apps/consumerWorker/ConsumerWorkerApp.js';
import type {
  ConsumerContainer,
  CreateConsumerContainerDeps
} from '../../../src/apps/consumerWorker/container.js';
import type { AppLogger } from '../../../src/Contexts/shared/plugins/logger.plugin.js';

const buildLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const CONSUMER_CONFIG = {
  kafka: {
    brokers: ['localhost:9092'],
    topic: 'agro.domain.events',
    consumerGroupId: 'agro-plant-likes-counter-consumer-test',
    clientId: 'agro-plant-likes-counter-consumer-test'
  },
  processedEventsTtlSeconds: 1209600,
  topicRetentionSeconds: 604800
};

const buildHarness = () => {
  let eachMessageHandler:
    ((payload: EachMessagePayload) => Promise<void>) | undefined;

  const kafkaConsumer = {
    connect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    disconnect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    subscribe: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined),
    run: jest
      .fn<
        Promise<void>,
        [{ eachMessage: (payload: EachMessagePayload) => Promise<void> }]
      >()
      .mockImplementation(({ eachMessage }) => {
        eachMessageHandler = eachMessage;
        return Promise.resolve();
      })
  };

  const plantLikesCounterConsumer = {
    handle: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined)
  };

  const close = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const db = jest.fn().mockReturnValue({});
  const client = { db, close } as unknown as MongoClient;

  const connect = jest.fn<Promise<MongoClient>, []>().mockResolvedValue(client);

  const containerDeps: CreateConsumerContainerDeps[] = [];
  const buildContainer = jest.fn(
    (deps: CreateConsumerContainerDeps): ConsumerContainer => {
      containerDeps.push(deps);
      return {
        resolve: jest.fn().mockImplementation((name: string) => {
          if (name === 'kafkaConsumer') return kafkaConsumer;
          if (name === 'plantLikesCounterConsumer')
            return plantLikesCounterConsumer;
          return undefined;
        })
      } as unknown as ConsumerContainer;
    }
  );

  const logger = buildLogger();

  const app = new ConsumerWorkerApp({
    logger,
    connect,
    buildContainer,
    consumerConfig: CONSUMER_CONFIG
  });

  return {
    app,
    logger,
    kafkaConsumer,
    plantLikesCounterConsumer,
    client,
    close,
    connect,
    buildContainer,
    containerDeps,
    triggerMessage: (value: string | null) =>
      eachMessageHandler?.({
        topic: CONSUMER_CONFIG.kafka.topic,
        partition: 0,
        message: {
          key: Buffer.from('key'),
          value: value ? Buffer.from(value) : null,
          timestamp: '1',
          attributes: 0,
          offset: '0',
          headers: {}
        },
        heartbeat: jest.fn(),
        pause: jest.fn()
      })
  };
};

describe('ConsumerWorkerApp', () => {
  it('connects, subscribes to domain topic, and starts listening for messages', async () => {
    const { app, kafkaConsumer, connect, buildContainer } = buildHarness();

    await app.start();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(buildContainer).toHaveBeenCalledTimes(1);
    expect(kafkaConsumer.connect).toHaveBeenCalledTimes(1);
    expect(kafkaConsumer.subscribe).toHaveBeenCalledWith({
      topic: 'agro.domain.events',
      fromBeginning: false
    });
    expect(kafkaConsumer.run).toHaveBeenCalledTimes(1);
  });

  it('wires no HTTP/Express dependency into the container', async () => {
    const { app, containerDeps } = buildHarness();

    await app.start();

    expect(
      Object.keys(containerDeps[0] ?? {}).sort((a, b) => a.localeCompare(b))
    ).toEqual(['client', 'consumerConfig', 'db', 'logger']);
  });

  it('disconnects Kafka consumer and closes Mongo connection in order on stop', async () => {
    const { app, kafkaConsumer, close } = buildHarness();

    await app.start();
    await app.stop();

    expect(kafkaConsumer.disconnect).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    const disconnectOrder =
      kafkaConsumer.disconnect.mock.invocationCallOrder[0] ?? Infinity;
    const closeOrder = close.mock.invocationCallOrder[0] ?? Infinity;
    expect(disconnectOrder).toBeLessThan(closeOrder);
  });

  it('closes Mongo connection even when Kafka consumer disconnect throws an error', async () => {
    const { app, kafkaConsumer, close } = buildHarness();
    kafkaConsumer.disconnect.mockRejectedValueOnce(
      new Error('Kafka network timeout')
    );

    await app.start();

    await expect(app.stop()).rejects.toThrow('Kafka network timeout');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('is a no-op on stop when never started', async () => {
    const { app, kafkaConsumer, close } = buildHarness();

    await expect(app.stop()).resolves.toBeUndefined();
    expect(kafkaConsumer.disconnect).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('parses valid Kafka message and dispatches it to plantLikesCounterConsumer', async () => {
    const { app, plantLikesCounterConsumer, triggerMessage } = buildHarness();
    const eventId = uuidv7();
    const plantId = uuidv4();
    const message = JSON.stringify({
      eventId,
      eventName: 'plant.liked',
      aggregateId: plantId,
      occurredAt: new Date().toISOString(),
      payload: { plantId }
    });

    await app.start();
    await triggerMessage(message);

    expect(plantLikesCounterConsumer.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId,
        eventName: 'plant.liked',
        aggregateId: plantId
      })
    );
  });

  it('logs error and skips processing when message payload is invalid JSON', async () => {
    const { app, logger, plantLikesCounterConsumer, triggerMessage } =
      buildHarness();

    await app.start();
    await triggerMessage('invalid-json');

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to parse Kafka message JSON',
      expect.any(Error)
    );
    expect(plantLikesCounterConsumer.handle).not.toHaveBeenCalled();
  });

  it('logs error and skips processing when message envelope is malformed', async () => {
    const { app, logger, plantLikesCounterConsumer, triggerMessage } =
      buildHarness();
    const malformed = JSON.stringify({
      eventId: 'not-uuidv7',
      eventName: 'plant.liked'
    });

    await app.start();
    await triggerMessage(malformed);

    expect(logger.error).toHaveBeenCalledWith(
      'Malformed Kafka domain event envelope',
      expect.anything()
    );
    expect(plantLikesCounterConsumer.handle).not.toHaveBeenCalled();
  });
});
