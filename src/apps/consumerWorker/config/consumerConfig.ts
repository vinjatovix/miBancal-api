import env from 'env-var';

import { loadEnvFile } from '../../../shared/infrastructure/config/loadEnvFile.js';

const DEFAULT_PROCESSED_EVENTS_TTL_SECONDS = 1209600; // 14 days
const DEFAULT_TOPIC_RETENTION_SECONDS = 604800; // 7 days

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

  return {
    kafka: {
      brokers,
      topic,
      consumerGroupId,
      clientId
    },
    processedEventsTtlSeconds,
    topicRetentionSeconds
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
