jest.mock(
  '../../../../src/shared/infrastructure/config/loadEnvFile.js',
  () => ({
    loadEnvFile: jest.fn()
  })
);

import {
  getConsumerConfig,
  resetConsumerConfigCache
} from '../../../../src/apps/consumerWorker/config/consumerConfig.js';

const CONSUMER_KEYS = [
  'KAFKA_BROKERS',
  'KAFKA_TOPIC',
  'KAFKA_CONSUMER_GROUP_ID',
  'KAFKA_CLIENT_ID',
  'PROCESSED_EVENTS_TTL_SECONDS',
  'KAFKA_TOPIC_RETENTION_SECONDS',
  'CONSUMER_MAX_RETRIES',
  'CONSUMER_RETRY_DELAYS_MS',
  'CONSUMER_RETRY_TOPIC_LABELS',
  'CONSUMER_DLQ_TOPIC',
  'CONSUMER_RETRY_CLIENT_ID',
  'KAFKA_TOPIC_PARTITIONS',
  'KAFKA_TOPIC_REPLICATION_FACTOR'
] as const;

const snapshot = new Map<string, string | undefined>();

const clearConsumerEnv = (): void => {
  for (const key of CONSUMER_KEYS) {
    delete process.env[key];
  }
};

beforeEach(() => {
  for (const key of CONSUMER_KEYS) {
    snapshot.set(key, process.env[key]);
  }
  resetConsumerConfigCache();
});

afterEach(() => {
  for (const key of CONSUMER_KEYS) {
    const value = snapshot.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  resetConsumerConfigCache();
});

describe('consumerConfig', () => {
  it('parses brokers and applies defaults', () => {
    clearConsumerEnv();
    process.env.KAFKA_BROKERS = 'broker-1:9092, broker-2:9092';

    const config = getConsumerConfig();

    expect(config.kafka.brokers).toEqual(['broker-1:9092', 'broker-2:9092']);
    expect(config.kafka.topic).toBe('agro.domain.events');
    expect(config.kafka.consumerGroupId).toBe('agro-domain-events-consumer');
    expect(config.kafka.clientId).toBe('agro-domain-events-consumer');
    expect(config.processedEventsTtlSeconds).toBe(1209600);
    expect(config.topicRetentionSeconds).toBe(604800);
  });

  it('honours explicit overrides', () => {
    clearConsumerEnv();
    process.env.KAFKA_BROKERS = 'custom-broker:9092';
    process.env.KAFKA_TOPIC = 'custom.events';
    process.env.KAFKA_CONSUMER_GROUP_ID = 'custom-group';
    process.env.KAFKA_CLIENT_ID = 'custom-client';
    process.env.PROCESSED_EVENTS_TTL_SECONDS = '2419200';
    process.env.KAFKA_TOPIC_RETENTION_SECONDS = '1209600';

    const config = getConsumerConfig();

    expect(config).toMatchObject({
      kafka: {
        brokers: ['custom-broker:9092'],
        topic: 'custom.events',
        consumerGroupId: 'custom-group',
        clientId: 'custom-client'
      },
      processedEventsTtlSeconds: 2419200,
      topicRetentionSeconds: 1209600
    });
  });

  it('throws an error when KAFKA_BROKERS is missing', () => {
    clearConsumerEnv();

    expect(() => getConsumerConfig()).toThrow(/KAFKA_BROKERS/);
  });

  it('throws an error when KAFKA_BROKERS contains only whitespace or delimiters', () => {
    clearConsumerEnv();
    process.env.KAFKA_BROKERS = '   ,   ';

    expect(() => getConsumerConfig()).toThrow(
      'KAFKA_BROKERS must contain at least one valid broker'
    );
  });

  it('throws an error when PROCESSED_EVENTS_TTL_SECONDS is less than topic retention', () => {
    clearConsumerEnv();
    process.env.KAFKA_BROKERS = 'localhost:9092';
    process.env.PROCESSED_EVENTS_TTL_SECONDS = '100';
    process.env.KAFKA_TOPIC_RETENTION_SECONDS = '1000';

    expect(() => getConsumerConfig()).toThrow(
      /must be greater than or equal to broker topic retention/
    );
  });

  describe('retry/DLQ slice', () => {
    it('applies the documented retry defaults when unset', () => {
      clearConsumerEnv();
      process.env.KAFKA_BROKERS = 'localhost:9092';

      const { retry } = getConsumerConfig();

      expect(retry.maxRetries).toBe(3);
      expect(retry.dlqTopic).toBe('agro.domain.events.dlq');
      expect(retry.clientId).toBe('agro-domain-events-consumer-producer');
      expect(retry.levels).toEqual([
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
      ]);
    });

    it('honours retry env overrides and derives topics from KAFKA_TOPIC', () => {
      clearConsumerEnv();
      process.env.KAFKA_BROKERS = 'localhost:9092';
      process.env.KAFKA_TOPIC = 'custom.events';
      process.env.CONSUMER_MAX_RETRIES = '2';
      process.env.CONSUMER_RETRY_DELAYS_MS = '1000,2000';
      process.env.CONSUMER_RETRY_TOPIC_LABELS = '1s,2s';
      process.env.CONSUMER_DLQ_TOPIC = 'custom.events.dead';
      process.env.CONSUMER_RETRY_CLIENT_ID = 'custom-producer';

      const { retry } = getConsumerConfig();

      expect(retry.maxRetries).toBe(2);
      expect(retry.dlqTopic).toBe('custom.events.dead');
      expect(retry.clientId).toBe('custom-producer');
      expect(retry.levels.map((level) => level.topic)).toEqual([
        'custom.events.retry.1s',
        'custom.events.retry.2s'
      ]);
    });

    it('rejects a delay/label count that does not match maxRetries', () => {
      clearConsumerEnv();
      process.env.KAFKA_BROKERS = 'localhost:9092';
      process.env.CONSUMER_MAX_RETRIES = '3';
      process.env.CONSUMER_RETRY_DELAYS_MS = '1000,2000';
      process.env.CONSUMER_RETRY_TOPIC_LABELS = '1s,2s';

      expect(() => getConsumerConfig()).toThrow(
        /must match the number of retry/
      );
    });

    it('rejects non-ascending retry delays', () => {
      clearConsumerEnv();
      process.env.KAFKA_BROKERS = 'localhost:9092';
      process.env.CONSUMER_MAX_RETRIES = '3';
      process.env.CONSUMER_RETRY_DELAYS_MS = '5000,5000,300000';
      process.env.CONSUMER_RETRY_TOPIC_LABELS = '5s,5s2,5m';

      expect(() => getConsumerConfig()).toThrow(/strictly ascending/);
    });

    it('rejects non-positive retry delays', () => {
      clearConsumerEnv();
      process.env.KAFKA_BROKERS = 'localhost:9092';
      process.env.CONSUMER_MAX_RETRIES = '3';
      process.env.CONSUMER_RETRY_DELAYS_MS = '0,30000,300000';
      process.env.CONSUMER_RETRY_TOPIC_LABELS = '5s,30s,5m';

      expect(() => getConsumerConfig()).toThrow(/positive integers/);
    });
  });
});
