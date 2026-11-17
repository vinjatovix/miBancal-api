import env from 'env-var';

import type {
  RetryConfig,
  RetryLevelConfig
} from '../../../Contexts/shared/application/consumers/index.js';
import { loadEnvFile } from '../../../shared/infrastructure/config/loadEnvFile.js';

const DEFAULT_PROCESSED_EVENTS_TTL_SECONDS = 1209600; // 14 days
const DEFAULT_TOPIC_RETENTION_SECONDS = 604800; // 7 days

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAYS_MS = '5000,30000,300000';
const DEFAULT_RETRY_TOPIC_LABELS = '5s,30s,5m';
const DEFAULT_RETRY_CLIENT_ID = 'agro-domain-events-consumer-producer';

const splitCsv = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const parseDelays = (raw: string): number[] =>
  splitCsv(raw).map((token) => {
    const delay = Number(token);
    if (!Number.isInteger(delay) || delay <= 0) {
      throw new Error(
        `CONSUMER_RETRY_DELAYS_MS must list positive integers, received "${token}"`
      );
    }
    return delay;
  });

const assertStrictlyAscending = (delays: readonly number[]): void => {
  for (let index = 1; index < delays.length; index += 1) {
    const previous = delays[index - 1] ?? 0;
    const current = delays[index] ?? 0;
    if (current <= previous) {
      throw new Error(
        `CONSUMER_RETRY_DELAYS_MS must be strictly ascending, received ${delays.join(',')}`
      );
    }
  }
};

const buildRetryConfig = (mainTopic: string): RetryConfig => {
  const maxRetries = env
    .get('CONSUMER_MAX_RETRIES')
    .default(String(DEFAULT_MAX_RETRIES))
    .asIntPositive();

  const delays = parseDelays(
    env
      .get('CONSUMER_RETRY_DELAYS_MS')
      .default(DEFAULT_RETRY_DELAYS_MS)
      .asString()
  );
  const labels = splitCsv(
    env
      .get('CONSUMER_RETRY_TOPIC_LABELS')
      .default(DEFAULT_RETRY_TOPIC_LABELS)
      .asString()
  );

  if (delays.length !== maxRetries || labels.length !== maxRetries) {
    throw new Error(
      `CONSUMER_MAX_RETRIES (${maxRetries}) must match the number of retry delays (${delays.length}) and labels (${labels.length})`
    );
  }
  assertStrictlyAscending(delays);

  const levels: RetryLevelConfig[] = labels.map((label, index) => ({
    label,
    topic: `${mainTopic}.retry.${label}`,
    delayMs: delays[index] ?? 0,
    attempt: index + 1
  }));

  return {
    maxRetries,
    levels,
    dlqTopic: env
      .get('CONSUMER_DLQ_TOPIC')
      .default(`${mainTopic}.dlq`)
      .asString(),
    clientId: env
      .get('CONSUMER_RETRY_CLIENT_ID')
      .default(DEFAULT_RETRY_CLIENT_ID)
      .asString(),
    topicPartitions: env
      .get('KAFKA_TOPIC_PARTITIONS')
      .default('6')
      .asIntPositive(),
    replicationFactor: env
      .get('KAFKA_TOPIC_REPLICATION_FACTOR')
      .default('1')
      .asIntPositive()
  };
};

function loadConsumerConfig() {
  loadEnvFile();

  const brokers = env
    .get('KAFKA_BROKERS')
    .required()
    .asString()
    .split(',')
    .map((broker) => broker.trim())
    .filter((broker) => broker.length > 0);

  if (brokers.length === 0) {
    throw new Error('KAFKA_BROKERS must contain at least one valid broker');
  }

  const topic = env.get('KAFKA_TOPIC').default('agro.domain.events').asString();

  const consumerGroupId = env
    .get('KAFKA_CONSUMER_GROUP_ID')
    .default('agro-domain-events-consumer')
    .asString();

  const clientId = env
    .get('KAFKA_CLIENT_ID')
    .default('agro-domain-events-consumer')
    .asString();

  const processedEventsTtlSeconds = env
    .get('PROCESSED_EVENTS_TTL_SECONDS')
    .default(String(DEFAULT_PROCESSED_EVENTS_TTL_SECONDS))
    .asIntPositive();

  const topicRetentionSeconds = env
    .get('KAFKA_TOPIC_RETENTION_SECONDS')
    .default(String(DEFAULT_TOPIC_RETENTION_SECONDS))
    .asIntPositive();

  if (processedEventsTtlSeconds < topicRetentionSeconds) {
    throw new Error(
      `PROCESSED_EVENTS_TTL_SECONDS (${processedEventsTtlSeconds}) must be greater than or equal to broker topic retention (${topicRetentionSeconds})`
    );
  }

  const retry = buildRetryConfig(topic);

  return {
    kafka: {
      brokers,
      topic,
      consumerGroupId,
      clientId
    },
    processedEventsTtlSeconds,
    topicRetentionSeconds,
    retry
  };
}

export type ConsumerConfig = ReturnType<typeof loadConsumerConfig>;

let cachedConsumerConfig: ConsumerConfig | undefined;

export const getConsumerConfig = (): ConsumerConfig => {
  cachedConsumerConfig ??= loadConsumerConfig();
  return cachedConsumerConfig;
};

export const resetConsumerConfigCache = (): void => {
  cachedConsumerConfig = undefined;
};
