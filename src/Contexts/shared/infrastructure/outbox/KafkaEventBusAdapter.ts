import {
  type ConnectableEventForwarder,
  derivePartitionKey,
  type OutboxRecord
} from '../../application/outbox/index.js';
import type { AppLogger } from '../../plugins/logger.plugin.js';

export type KafkaMessage = { key: string; value: string };

export type KafkaProducerRecord = {
  topic: string;
  acks: number;
  messages: KafkaMessage[];
};

export type KafkaProducerLike = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(record: KafkaProducerRecord): Promise<unknown>;
};

export type KafkaAdminLike = {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTopics(): Promise<string[]>;
  createTopics(options: {
    topics: {
      topic: string;
      numPartitions: number;
      replicationFactor: number;
    }[];
  }): Promise<boolean>;
};

export type KafkaForwarderConfig = {
  topic: string;
  acks: string;
  topicPartitions: number;
  replicationFactor: number;
};

export type KafkaEventBusAdapterDependencies = {
  kafkaProducer: KafkaProducerLike;
  kafkaAdmin: KafkaAdminLike;
  kafkaConfig: KafkaForwarderConfig;
  logger: AppLogger;
};

type MessageValue = {
  eventId: string;
  eventName: string;
  aggregateId: string;
  occurredAt: Date;
  payload: object;
};

const resolveAcks = (acks: string): number => {
  if (acks === '0') {
    return 0;
  }
  if (acks === '1') {
    return 1;
  }
  return -1;
};

export class KafkaEventBusAdapter implements ConnectableEventForwarder {
  private readonly producer: KafkaProducerLike;
  private readonly admin: KafkaAdminLike;
  private readonly logger: AppLogger;
  private readonly topic: string;
  private readonly topicPartitions: number;
  private readonly replicationFactor: number;
  private readonly acks: number;

  constructor({
    kafkaProducer,
    kafkaAdmin,
    kafkaConfig,
    logger
  }: KafkaEventBusAdapterDependencies) {
    this.producer = kafkaProducer;
    this.admin = kafkaAdmin;
    this.logger = logger;
    this.topic = kafkaConfig.topic;
    this.topicPartitions = kafkaConfig.topicPartitions;
    this.replicationFactor = kafkaConfig.replicationFactor;
    this.acks = resolveAcks(kafkaConfig.acks);
  }

  public async connect(): Promise<void> {
    await this.producer.connect();
    await this.ensureTopic();
  }

  public async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  public async forward(record: OutboxRecord): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      acks: this.acks,
      messages: [
        {
          key: derivePartitionKey(record),
          value: JSON.stringify(this.toMessageValue(record))
        }
      ]
    });
  }

  private toMessageValue(record: OutboxRecord): MessageValue {
    return {
      eventId: record.eventId,
      eventName: record.eventName,
      aggregateId: record.aggregateId,
      occurredAt: record.occurredAt,
      payload: record.payload
    };
  }

  private async ensureTopic(): Promise<void> {
    try {
      await this.admin.connect();
      if (await this.topicExists()) {
        this.logger.info(`Kafka topic ${this.topic} already present`);
        return;
      }
      await this.admin.createTopics({
        topics: [
          {
            topic: this.topic,
            numPartitions: this.topicPartitions,
            replicationFactor: this.replicationFactor
          }
        ]
      });
      this.logger.info(
        `Kafka topic ${this.topic} ensured (${this.topicPartitions} partitions, RF ${this.replicationFactor})`
      );
    } catch (error) {
      // A managed broker may deny topic administration to the app credential and
      // provision the topic out-of-band; ensure is therefore best-effort and must
      // never block startup — a still-missing topic surfaces as a retryable
      // forward() failure (record stays pending, at-least-once preserved).
      this.logger.warn(
        `Kafka topic ${this.topic} ensure skipped; relying on external provisioning`,
        error
      );
    } finally {
      await this.admin.disconnect().catch(() => undefined);
    }
  }

  private async topicExists(): Promise<boolean> {
    const topics = await this.admin.listTopics();
    return topics.includes(this.topic);
  }
}
