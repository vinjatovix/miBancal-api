import type {
  Consumer,
  EachBatchPayload,
  KafkaMessage,
  Producer
} from 'kafkajs';
import type { MongoClient } from 'mongodb';

import {
  ConsumerDispatchFailure,
  type ConsumerDispatcher,
  type DelayGate,
  type MessageHeaders,
  type MessagePublisher,
  type RetryContext,
  type RetryRouter
} from '../../Contexts/shared/application/consumers/index.js';
import {
  type KafkaDomainEventEnvelope,
  kafkaDomainEventEnvelopeSchema
} from '../../Contexts/shared/domain/events/index.js';
import type { AppLogger } from '../../Contexts/shared/plugins/index.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../shared/infrastructure/persistence/index.js';
import {
  getConsumerConfig,
  type ConsumerConfig
} from './config/consumerConfig.js';
import {
  createConsumerContainer,
  type ConsumerContainer,
  type CreateConsumerContainerDeps
} from './container.js';

type MessageAction =
  | { kind: 'resolve' }
  | { kind: 'defer'; remainingMs: number }
  | { kind: 'stop' };

type RoutingDependencies = {
  dispatcher: ConsumerDispatcher;
  retryRouter: RetryRouter;
  delayGate: DelayGate;
  retryContext: RetryContext;
};

type MessageContext = {
  topic: string;
  key: string;
  value: Buffer;
  headers: MessageHeaders;
  envelope: KafkaDomainEventEnvelope;
  now: Date;
};

export type ScheduleDelay = (callback: () => void, delayMs: number) => void;

export type ConsumerWorkerAppDependencies = {
  logger: AppLogger;
  connect?: () => Promise<MongoClient>;
  buildContainer?: (deps: CreateConsumerContainerDeps) => ConsumerContainer;
  consumerConfig?: ConsumerConfig;
  scheduleDelay?: ScheduleDelay;
};

export class ConsumerWorkerApp {
  private readonly logger: AppLogger;
  private readonly connect: () => Promise<MongoClient>;
  private readonly buildContainer: (
    deps: CreateConsumerContainerDeps
  ) => ConsumerContainer;
  private readonly consumerConfig: ConsumerConfig;
  private readonly scheduleDelay: ScheduleDelay;

  private client?: MongoClient;
  private consumer?: Consumer;
  private retryProducer?: Producer;

  constructor({
    logger,
    connect,
    buildContainer,
    consumerConfig,
    scheduleDelay
  }: ConsumerWorkerAppDependencies) {
    this.logger = logger;
    this.connect =
      connect ??
      (() =>
        DBClientFactory.createClient(
          'consumerWorker',
          DBConfigFactory.createConfig()
        ));
    this.buildContainer = buildContainer ?? createConsumerContainer;
    this.consumerConfig = consumerConfig ?? getConsumerConfig();
    this.scheduleDelay =
      scheduleDelay ??
      ((callback, delayMs) => {
        setTimeout(callback, delayMs);
      });
  }

  public async start(): Promise<void> {
    this.client = await this.connect();
    const container = this.buildContainer({
      db: this.client.db(),
      client: this.client,
      logger: this.logger,
      consumerConfig: this.consumerConfig
    });

    this.consumer = container.resolve('kafkaConsumer');
    this.retryProducer = container.resolve('kafkaRetryProducer');
    const messagePublisher = container.resolve('messagePublisher');
    const routing: RoutingDependencies = {
      dispatcher: container.resolve('consumerDispatcher'),
      retryRouter: container.resolve('retryRouter'),
      delayGate: container.resolve('delayGate'),
      retryContext: container.resolve('retryContext')
    };

    await this.retryProducer.connect();
    await this.ensureRetryTopics(messagePublisher);

    await this.consumer.connect();
    this.logger.info('Kafka consumer connected');

    const topics = this.subscriptionTopics();
    await this.consumer.subscribe({ topics, fromBeginning: false });
    this.logger.info(
      `Kafka consumer subscribed to topics ${topics.join(', ')}`
    );

    await this.consumer.run({
      eachBatchAutoResolve: false,
      eachBatch: (payload) => this.processBatch(payload, routing)
    });

    this.logger.info('Consumer worker started; listening for domain events');
  }

  public async stop(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.logger.info('Kafka consumer disconnected');
      }
      if (this.retryProducer) {
        await this.retryProducer.disconnect();
        this.logger.info('Kafka retry producer disconnected');
      }
    } finally {
      if (this.client) {
        await this.client.close();
        this.logger.info('Consumer worker database connection closed');
      }
    }
  }

  private subscriptionTopics(): string[] {
    return [
      this.consumerConfig.kafka.topic,
      ...this.consumerConfig.retry.levels.map((level) => level.topic)
    ];
  }

  private async ensureRetryTopics(
    messagePublisher: MessagePublisher
  ): Promise<void> {
    await messagePublisher.ensureTopics([
      ...this.consumerConfig.retry.levels.map((level) => level.topic),
      this.consumerConfig.retry.dlqTopic
    ]);
  }

  private async processBatch(
    payload: EachBatchPayload,
    routing: RoutingDependencies
  ): Promise<void> {
    const { batch } = payload;
    for (const message of batch.messages) {
      const action = await this.processMessage(batch.topic, message, routing);

      if (action.kind === 'resolve') {
        payload.resolveOffset(message.offset);
        await payload.heartbeat();
        continue;
      }

      if (action.kind === 'defer') {
        this.deferPartition(
          batch.topic,
          batch.partition,
          message.offset,
          action.remainingMs
        );
      }

      return;
    }
  }

  private async processMessage(
    topic: string,
    message: KafkaMessage,
    routing: RoutingDependencies
  ): Promise<MessageAction> {
    const value = message.value;
    if (!value) {
      return { kind: 'resolve' };
    }

    const envelope = this.parseEnvelope(value);
    if (!envelope) {
      return { kind: 'resolve' };
    }

    const context: MessageContext = {
      topic,
      key: envelope.aggregateId,
      value,
      headers: message.headers ?? {},
      envelope,
      now: new Date()
    };
    const attempt = routing.retryContext.readAttempt(topic, context.headers);

    if (attempt.kind === 'corrupt') {
      return this.route(routing, context, { attempt: 0, corrupt: true });
    }

    const gate = routing.delayGate.evaluate(
      topic,
      routing.retryContext.readEnqueuedAt(context.headers),
      context.now
    );
    if (gate.kind === 'defer') {
      return { kind: 'defer', remainingMs: gate.remainingMs };
    }

    return this.dispatch(routing, context, attempt.attempt);
  }

  private async dispatch(
    routing: RoutingDependencies,
    context: MessageContext,
    attempt: number
  ): Promise<MessageAction> {
    try {
      await routing.dispatcher.dispatch(context.envelope);
      return { kind: 'resolve' };
    } catch (error: unknown) {
      if (!(error instanceof ConsumerDispatchFailure)) {
        this.logger.error('Unexpected consumer dispatch error', error, {
          eventId: context.envelope.eventId,
          eventName: context.envelope.eventName
        });
        return { kind: 'stop' };
      }

      return this.route(routing, context, {
        attempt,
        corrupt: false,
        failure: error
      });
    }
  }

  private async route(
    routing: RoutingDependencies,
    context: MessageContext,
    outcome: {
      attempt: number;
      corrupt: boolean;
      failure?: ConsumerDispatchFailure;
    }
  ): Promise<MessageAction> {
    try {
      await routing.retryRouter.route({
        sourceTopic: context.topic,
        key: context.key,
        value: context.value,
        headers: context.headers,
        attempt: outcome.attempt,
        corrupt: outcome.corrupt,
        ...(outcome.failure ? { failure: outcome.failure } : {}),
        envelope: context.envelope,
        now: context.now
      });
      return { kind: 'resolve' };
    } catch (error: unknown) {
      this.logger.error('Failed to route failed domain event', error, {
        eventId: context.envelope.eventId,
        eventName: context.envelope.eventName
      });
      return { kind: 'stop' };
    }
  }

  private deferPartition(
    topic: string,
    partition: number,
    offset: string,
    remainingMs: number
  ): void {
    const consumer = this.consumer;
    if (!consumer) {
      return;
    }
    consumer.pause([{ topic, partitions: [partition] }]);
    consumer.seek({ topic, partition, offset });
    this.scheduleDelay(() => {
      consumer.resume([{ topic, partitions: [partition] }]);
    }, remainingMs);
  }

  private parseEnvelope(value: Buffer): KafkaDomainEventEnvelope | undefined {
    let raw: unknown;
    try {
      raw = JSON.parse(value.toString('utf8'));
    } catch (error) {
      this.logger.error('Failed to parse Kafka message JSON', error);
      return undefined;
    }

    const parseResult = kafkaDomainEventEnvelopeSchema.safeParse(raw);
    if (!parseResult.success) {
      this.logger.error(
        'Malformed Kafka domain event envelope',
        parseResult.error
      );
      return undefined;
    }

    return parseResult.data;
  }
}
