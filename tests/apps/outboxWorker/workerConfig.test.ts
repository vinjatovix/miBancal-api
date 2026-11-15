jest.mock('../../../src/shared/infrastructure/config/loadEnvFile.js', () => ({
  loadEnvFile: jest.fn()
}));

import {
  getWorkerConfig,
  resetWorkerConfigCache
} from '../../../src/apps/outboxWorker/config/workerConfig.js';

const KAFKA_KEYS = [
  'KAFKA_BROKERS',
  'KAFKA_TOPIC',
  'KAFKA_CLIENT_ID',
  'KAFKA_ACKS',
  'KAFKA_TOPIC_PARTITIONS',
  'KAFKA_TOPIC_REPLICATION_FACTOR',
  'KAFKA_PRODUCER_RETRIES',
  'KAFKA_PRODUCER_RETRY_BACKOFF_MS'
] as const;

const snapshot = new Map<string, string | undefined>();

const clearKafkaEnv = (): void => {
  for (const key of KAFKA_KEYS) {
    delete process.env[key];
  }
};

beforeEach(() => {
  for (const key of KAFKA_KEYS) {
    snapshot.set(key, process.env[key]);
  }
  resetWorkerConfigCache();
});

afterEach(() => {
  for (const key of KAFKA_KEYS) {
    const value = snapshot.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  resetWorkerConfigCache();
});

describe('workerConfig Kafka slice', () => {
  it('parses comma-separated brokers and applies documented defaults', () => {
    clearKafkaEnv();
    process.env.KAFKA_BROKERS = 'broker-a:9092, broker-b:9092';

    const { kafka } = getWorkerConfig();

    expect(kafka.brokers).toEqual(['broker-a:9092', 'broker-b:9092']);
    expect(kafka.topic).toBe('agro.domain.events');
    expect(kafka.clientId).toBe('agro-outbox-worker');
    expect(kafka.acks).toBe('all');
    expect(kafka.topicPartitions).toBe(6);
    expect(kafka.replicationFactor).toBe(1);
    expect(kafka.producerRetries).toBe(5);
    expect(kafka.producerRetryBackoffMs).toBe(300);
  });

  it('honours explicit overrides for every Kafka key', () => {
    clearKafkaEnv();
    process.env.KAFKA_BROKERS = 'prod-broker:9092';
    process.env.KAFKA_TOPIC = 'custom.topic';
    process.env.KAFKA_CLIENT_ID = 'custom-client';
    process.env.KAFKA_ACKS = '1';
    process.env.KAFKA_TOPIC_PARTITIONS = '12';
    process.env.KAFKA_TOPIC_REPLICATION_FACTOR = '3';
    process.env.KAFKA_PRODUCER_RETRIES = '9';
    process.env.KAFKA_PRODUCER_RETRY_BACKOFF_MS = '750';

    const { kafka } = getWorkerConfig();

    expect(kafka).toEqual({
      brokers: ['prod-broker:9092'],
      topic: 'custom.topic',
      clientId: 'custom-client',
      acks: '1',
      topicPartitions: 12,
      replicationFactor: 3,
      producerRetries: 9,
      producerRetryBackoffMs: 750
    });
  });

  it('fails fast with a message naming KAFKA_BROKERS when it is missing', () => {
    clearKafkaEnv();

    expect(() => getWorkerConfig()).toThrow(/KAFKA_BROKERS/);
  });
});
