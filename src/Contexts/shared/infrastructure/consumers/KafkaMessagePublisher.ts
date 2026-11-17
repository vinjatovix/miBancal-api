import type { Admin, Producer } from 'kafkajs';

import type {
  MessagePublisher,
  OutboundMessage
} from '../../application/consumers/index.js';
import type { AppLogger } from '../../plugins/index.js';

const ACKS_ALL = -1;

export type KafkaMessagePublisherDependencies = {
  kafkaRetryProducer: Producer;
  kafkaRetryAdmin: Admin;
  retryTopicPartitions: number;
  retryReplicationFactor: number;
  logger: AppLogger;
};

export class KafkaMessagePublisher implements MessagePublisher {
  private readonly producer: Producer;
  private readonly admin: Admin;
  private readonly topicPartitions: number;
  private readonly replicationFactor: number;
  private readonly logger: AppLogger;

  constructor({
    kafkaRetryProducer,
    kafkaRetryAdmin,
    retryTopicPartitions,
    retryReplicationFactor,
    logger
  }: KafkaMessagePublisherDependencies) {
    this.producer = kafkaRetryProducer;
    this.admin = kafkaRetryAdmin;
    this.topicPartitions = retryTopicPartitions;
    this.replicationFactor = retryReplicationFactor;
    this.logger = logger;
  }

  public async send(message: OutboundMessage): Promise<void> {
    await this.producer.send({
      topic: message.topic,
      acks: ACKS_ALL,
      messages: [
        {
          key: message.key,
          value: message.value,
          headers: message.headers
        }
      ]
    });
  }

  public async ensureTopics(topics: string[]): Promise<void> {
    try {
      await this.admin.connect();
      const existing = new Set(await this.admin.listTopics());
      const missing = topics.filter((topic) => !existing.has(topic));
      if (missing.length === 0) {
        return;
      }
      await this.admin.createTopics({
        topics: missing.map((topic) => ({
          topic,
          numPartitions: this.topicPartitions,
          replicationFactor: this.replicationFactor
        }))
      });
      this.logger.info(`Kafka retry/DLQ topics ensured: ${missing.join(', ')}`);
    } catch (error) {
      // A managed broker may deny topic administration and provision retry/DLQ
      // topics out-of-band; ensure is best-effort and must never block startup.
      this.logger.warn(
        'Kafka retry/DLQ topic ensure skipped; relying on external provisioning',
        error
      );
    } finally {
      await this.admin.disconnect().catch(() => undefined);
    }
  }
}
