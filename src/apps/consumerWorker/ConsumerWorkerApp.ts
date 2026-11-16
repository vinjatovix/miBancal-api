import type { Consumer } from 'kafkajs';
import type { MongoClient } from 'mongodb';

import { kafkaDomainEventEnvelopeSchema } from '../../Contexts/shared/domain/events/index.js';
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

export type ConsumerWorkerAppDependencies = {
  logger: AppLogger;
  connect?: () => Promise<MongoClient>;
  buildContainer?: (deps: CreateConsumerContainerDeps) => ConsumerContainer;
  consumerConfig?: ConsumerConfig;
};

export class ConsumerWorkerApp {
  private readonly logger: AppLogger;
  private readonly connect: () => Promise<MongoClient>;
  private readonly buildContainer: (
    deps: CreateConsumerContainerDeps
  ) => ConsumerContainer;
  private readonly consumerConfig: ConsumerConfig;

  private client?: MongoClient;
  private consumer?: Consumer;

  constructor({
    logger,
    connect,
    buildContainer,
    consumerConfig
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
    const plantLikesCounterConsumer = container.resolve(
      'plantLikesCounterConsumer'
    );

    await this.consumer.connect();
    this.logger.info('Kafka consumer connected');

    await this.consumer.subscribe({
      topic: this.consumerConfig.kafka.topic,
      fromBeginning: false
    });
    this.logger.info(
      `Kafka consumer subscribed to topic ${this.consumerConfig.kafka.topic}`
    );

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return;
        }

        let raw: unknown;
        try {
          raw = JSON.parse(message.value.toString('utf8'));
        } catch (err) {
          this.logger.error('Failed to parse Kafka message JSON', err);
          return;
        }

        const parseResult = kafkaDomainEventEnvelopeSchema.safeParse(raw);
        if (!parseResult.success) {
          this.logger.error(
            'Malformed Kafka domain event envelope',
            parseResult.error
          );
          return;
        }

        await plantLikesCounterConsumer.handle(parseResult.data);
      }
    });

    this.logger.info('Consumer worker started; listening for domain events');
  }

  public async stop(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.logger.info('Kafka consumer disconnected');
      }
    } finally {
      if (this.client) {
        await this.client.close();
        this.logger.info('Consumer worker database connection closed');
      }
    }
  }
}
