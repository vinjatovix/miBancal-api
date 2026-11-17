import type { EachBatchPayload } from 'kafkajs';
import type { MongoClient } from 'mongodb';
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import { ConsumerWorkerApp } from '../../../src/apps/consumerWorker/ConsumerWorkerApp.js';
import type {
  ConsumerContainer,
  CreateConsumerContainerDeps
} from '../../../src/apps/consumerWorker/container.js';
import { ConsumerDispatchFailure } from '../../../src/Contexts/shared/application/consumers/index.js';
import type { AppLogger } from '../../../src/Contexts/shared/plugins/logger.plugin.js';

const buildLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const RETRY_LEVELS = [
  {
    label: '5s',
    topic: 'agro.domain.events.retry.5s',
    delayMs: 5000,
    attempt: 1
  },
  {
    label: '30s',
    topic: 'agro.domain.events.retry.30s',
    delayMs: 30000,
    attempt: 2
  },
  {
    label: '5m',
    topic: 'agro.domain.events.retry.5m',
    delayMs: 300000,
    attempt: 3
  }
];

const CONSUMER_CONFIG = {
  kafka: {
    brokers: ['localhost:9092'],
    topic: 'agro.domain.events',
    consumerGroupId: 'agro-plant-likes-counter-consumer-test',
    clientId: 'agro-plant-likes-counter-consumer-test'
  },
  processedEventsTtlSeconds: 1209600,
  topicRetentionSeconds: 604800,
  retry: {
    maxRetries: 3,
    levels: RETRY_LEVELS,
    dlqTopic: 'agro.domain.events.dlq',
    clientId: 'agro-domain-events-consumer-producer',
    topicPartitions: 6,
    replicationFactor: 1
  }
};

type BatchMessage = {
  value: string | null;
  offset: string;
  headers?: Record<string, Buffer>;
};

const buildHarness = () => {
  let eachBatchHandler:
    ((payload: EachBatchPayload) => Promise<void>) | undefined;

  const kafkaConsumer = {
    connect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    disconnect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    subscribe: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined),
    pause: jest.fn(),
    seek: jest.fn(),
    resume: jest.fn(),
    run: jest
      .fn<
        Promise<void>,
        [{ eachBatch: (payload: EachBatchPayload) => Promise<void> }]
      >()
      .mockImplementation(({ eachBatch }) => {
        eachBatchHandler = eachBatch;
        return Promise.resolve();
      })
  };

  const consumerDispatcher = {
    dispatch: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined)
  };
  const retryRouter = {
    route: jest
      .fn<Promise<{ kind: string }>, [unknown]>()
      .mockResolvedValue({ kind: 'republished' })
  };
  const delayGate = {
    evaluate: jest.fn().mockReturnValue({ kind: 'proceed' })
  };
  const retryContext = {
    readAttempt: jest.fn().mockReturnValue({ kind: 'fresh', attempt: 0 }),
    readEnqueuedAt: jest.fn().mockReturnValue(undefined),
    readFirstFailedAt: jest.fn().mockReturnValue(undefined)
  };
  const messagePublisher = {
    send: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined),
    ensureTopics: jest
      .fn<Promise<void>, [string[]]>()
      .mockResolvedValue(undefined)
  };
  const kafkaRetryProducer = {
    connect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    disconnect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined)
  };

  const resolveMap: Record<string, unknown> = {
    kafkaConsumer,
    consumerDispatcher,
    retryRouter,
    delayGate,
    retryContext,
    messagePublisher,
    kafkaRetryProducer
  };

  const close = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const db = jest.fn().mockReturnValue({});
  const client = { db, close } as unknown as MongoClient;
  const connect = jest.fn<Promise<MongoClient>, []>().mockResolvedValue(client);

  const buildContainer = jest.fn(
    (_deps: CreateConsumerContainerDeps): ConsumerContainer =>
      ({
        resolve: jest
          .fn()
          .mockImplementation((name: string) => resolveMap[name])
      }) as unknown as ConsumerContainer
  );

  const logger = buildLogger();
  const scheduleDelay = jest.fn<void, [() => void, number]>();

  const app = new ConsumerWorkerApp({
    logger,
    connect,
    buildContainer,
    consumerConfig: CONSUMER_CONFIG,
    scheduleDelay
  });

  const resolveOffset = jest.fn();
  const heartbeat = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

  const triggerBatch = (
    messages: BatchMessage[],
    topic = CONSUMER_CONFIG.kafka.topic,
    partition = 0
  ) =>
    eachBatchHandler?.({
      batch: {
        topic,
        partition,
        messages: messages.map((message) => ({
          key: Buffer.from('key'),
          value: message.value ? Buffer.from(message.value) : null,
          timestamp: '1',
          attributes: 0,
          offset: message.offset,
          headers: message.headers ?? {}
        }))
      },
      resolveOffset,
      heartbeat
    } as unknown as EachBatchPayload);

  return {
    app,
    logger,
    kafkaConsumer,
    consumerDispatcher,
    retryRouter,
    delayGate,
    retryContext,
    messagePublisher,
    kafkaRetryProducer,
    close,
    scheduleDelay,
    resolveOffset,
    triggerBatch
  };
};

const validEnvelope = (): string =>
  JSON.stringify({
    eventId: uuidv7(),
    eventName: 'plant.liked',
    aggregateId: uuidv4(),
    occurredAt: new Date().toISOString(),
    payload: {}
  });

describe('ConsumerWorkerApp', () => {
  describe('startup (W-05)', () => {
    it('connects the retry producer, ensures retry/DLQ topics, and subscribes to main + retry topics only', async () => {
      const { app, kafkaConsumer, kafkaRetryProducer, messagePublisher } =
        buildHarness();

      await app.start();

      expect(kafkaRetryProducer.connect).toHaveBeenCalledTimes(1);
      expect(messagePublisher.ensureTopics).toHaveBeenCalledWith([
        'agro.domain.events.retry.5s',
        'agro.domain.events.retry.30s',
        'agro.domain.events.retry.5m',
        'agro.domain.events.dlq'
      ]);
      expect(kafkaConsumer.subscribe).toHaveBeenCalledWith({
        topics: [
          'agro.domain.events',
          'agro.domain.events.retry.5s',
          'agro.domain.events.retry.30s',
          'agro.domain.events.retry.5m'
        ],
        fromBeginning: false
      });
      expect(kafkaConsumer.run).toHaveBeenCalledWith(
        expect.objectContaining({ eachBatchAutoResolve: false })
      );
    });
  });

  describe('batch loop', () => {
    it('resolves the offset when the dispatch succeeds (acknowledged)', async () => {
      const { app, resolveOffset, triggerBatch } = buildHarness();

      await app.start();
      await triggerBatch([{ value: validEnvelope(), offset: '10' }]);

      expect(resolveOffset).toHaveBeenCalledWith('10');
    });

    it('resolves the offset after a failure is republished', async () => {
      const {
        app,
        consumerDispatcher,
        retryRouter,
        resolveOffset,
        triggerBatch
      } = buildHarness();
      consumerDispatcher.dispatch.mockRejectedValueOnce(
        new ConsumerDispatchFailure([
          { consumer: 'plant-likes-counter', error: new Error('transient') }
        ])
      );
      retryRouter.route.mockResolvedValueOnce({ kind: 'republished' });

      await app.start();
      await triggerBatch([{ value: validEnvelope(), offset: '7' }]);

      expect(retryRouter.route).toHaveBeenCalledTimes(1);
      expect(resolveOffset).toHaveBeenCalledWith('7');
    });

    it('defers a not-yet-elapsed retry message with pause + seek + scheduled resume and does not resolve', async () => {
      const {
        app,
        kafkaConsumer,
        retryContext,
        delayGate,
        scheduleDelay,
        resolveOffset,
        triggerBatch
      } = buildHarness();
      retryContext.readAttempt.mockReturnValue({ kind: 'valid', attempt: 1 });
      delayGate.evaluate.mockReturnValue({ kind: 'defer', remainingMs: 3000 });

      await app.start();
      await triggerBatch(
        [{ value: validEnvelope(), offset: '3' }],
        'agro.domain.events.retry.5s',
        2
      );

      expect(kafkaConsumer.pause).toHaveBeenCalledWith([
        { topic: 'agro.domain.events.retry.5s', partitions: [2] }
      ]);
      expect(kafkaConsumer.seek).toHaveBeenCalledWith({
        topic: 'agro.domain.events.retry.5s',
        partition: 2,
        offset: '3'
      });
      expect(scheduleDelay).toHaveBeenCalledWith(expect.any(Function), 3000);
      expect(resolveOffset).not.toHaveBeenCalled();

      const scheduledResume = scheduleDelay.mock.calls[0]?.[0];
      scheduledResume?.();
      expect(kafkaConsumer.resume).toHaveBeenCalledWith([
        { topic: 'agro.domain.events.retry.5s', partitions: [2] }
      ]);
    });

    it('stops the batch without resolving when the router publish throws', async () => {
      const {
        app,
        consumerDispatcher,
        retryRouter,
        resolveOffset,
        logger,
        triggerBatch
      } = buildHarness();
      consumerDispatcher.dispatch.mockRejectedValueOnce(
        new ConsumerDispatchFailure([
          { consumer: 'plant-likes-counter', error: new Error('transient') }
        ])
      );
      retryRouter.route.mockRejectedValueOnce(new Error('broker down'));

      await app.start();
      await triggerBatch([{ value: validEnvelope(), offset: '5' }]);

      expect(resolveOffset).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to route failed domain event',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('processes a healthy message behind a failed one and resolves both offsets', async () => {
      const { app, consumerDispatcher, resolveOffset, triggerBatch } =
        buildHarness();
      consumerDispatcher.dispatch
        .mockRejectedValueOnce(
          new ConsumerDispatchFailure([
            { consumer: 'plant-likes-counter', error: new Error('transient') }
          ])
        )
        .mockResolvedValueOnce(undefined);

      await app.start();
      await triggerBatch([
        { value: validEnvelope(), offset: '1' },
        { value: validEnvelope(), offset: '2' }
      ]);

      expect(resolveOffset).toHaveBeenCalledWith('1');
      expect(resolveOffset).toHaveBeenCalledWith('2');
    });

    it('routes a corrupt attempt count straight to the DLQ and resolves', async () => {
      const { app, retryContext, retryRouter, resolveOffset, triggerBatch } =
        buildHarness();
      retryContext.readAttempt.mockReturnValue({ kind: 'corrupt' });
      retryRouter.route.mockResolvedValueOnce({ kind: 'dead-lettered' });

      await app.start();
      await triggerBatch(
        [{ value: validEnvelope(), offset: '9' }],
        'agro.domain.events.retry.5s',
        0
      );

      expect(retryRouter.route).toHaveBeenCalledWith(
        expect.objectContaining({ corrupt: true })
      );
      expect(resolveOffset).toHaveBeenCalledWith('9');
    });

    it('resolves and skips dispatch on invalid JSON', async () => {
      const { app, logger, consumerDispatcher, resolveOffset, triggerBatch } =
        buildHarness();

      await app.start();
      await triggerBatch([{ value: 'not-json', offset: '0' }]);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse Kafka message JSON',
        expect.any(Error)
      );
      expect(consumerDispatcher.dispatch).not.toHaveBeenCalled();
      expect(resolveOffset).toHaveBeenCalledWith('0');
    });

    it('resolves and skips dispatch on a malformed envelope', async () => {
      const { app, logger, consumerDispatcher, resolveOffset, triggerBatch } =
        buildHarness();
      const malformed = JSON.stringify({
        eventId: 'not-uuidv7',
        eventName: 'plant.liked'
      });

      await app.start();
      await triggerBatch([{ value: malformed, offset: '0' }]);

      expect(logger.error).toHaveBeenCalledWith(
        'Malformed Kafka domain event envelope',
        expect.anything()
      );
      expect(consumerDispatcher.dispatch).not.toHaveBeenCalled();
      expect(resolveOffset).toHaveBeenCalledWith('0');
    });
  });

  describe('lifecycle', () => {
    it('disconnects consumer and retry producer and closes Mongo on stop', async () => {
      const { app, kafkaConsumer, kafkaRetryProducer, close } = buildHarness();

      await app.start();
      await app.stop();

      expect(kafkaConsumer.disconnect).toHaveBeenCalledTimes(1);
      expect(kafkaRetryProducer.disconnect).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('is a no-op on stop when never started', async () => {
      const { app, kafkaConsumer, close } = buildHarness();

      await expect(app.stop()).resolves.toBeUndefined();
      expect(kafkaConsumer.disconnect).not.toHaveBeenCalled();
      expect(close).not.toHaveBeenCalled();
    });
  });
});
