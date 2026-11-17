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
  'KAFKA_TOPIC_RETENTION_SECONDS'
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

    expect(config).toEqual({
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
});
