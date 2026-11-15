import env from 'env-var';

import { loadEnvFile } from '../../../shared/infrastructure/config/loadEnvFile.js';

function loadWorkerConfig() {
  loadEnvFile();

  const watchdogIntervalMs = env
    .get('OUTBOX_WORKER_WATCHDOG_INTERVAL_MS')
    .default('5000')
    .asIntPositive();
  const stallTimeoutMs = env
    .get('OUTBOX_WORKER_STALL_TIMEOUT_MS')
    .default('30000')
    .asIntPositive();

  const kafka = {
    brokers: env
      .get('KAFKA_BROKERS')
      .required()
      .asString()
      .split(',')
      .map((broker) => broker.trim())
      .filter((broker) => broker.length > 0),
    topic: env.get('KAFKA_TOPIC').default('agro.domain.events').asString(),
    clientId: env
      .get('KAFKA_CLIENT_ID')
      .default('agro-outbox-worker')
      .asString(),
    acks: env.get('KAFKA_ACKS').default('all').asString(),
    topicPartitions: env
      .get('KAFKA_TOPIC_PARTITIONS')
      .default('6')
      .asIntPositive(),
    replicationFactor: env
      .get('KAFKA_TOPIC_REPLICATION_FACTOR')
      .default('1')
      .asIntPositive(),
    producerRetries: env.get('KAFKA_PRODUCER_RETRIES').default('5').asInt(),
    producerRetryBackoffMs: env
      .get('KAFKA_PRODUCER_RETRY_BACKOFF_MS')
      .default('300')
      .asIntPositive()
  };

  return {
    OUTBOX_WORKER_FALLBACK_BATCH_SIZE: env
      .get('OUTBOX_WORKER_FALLBACK_BATCH_SIZE')
      .default('100')
      .asIntPositive(),
    OUTBOX_WORKER_RECONNECT_INITIAL_MS: env
      .get('OUTBOX_WORKER_RECONNECT_INITIAL_MS')
      .default('500')
      .asIntPositive(),
    OUTBOX_WORKER_RECONNECT_MAX_MS: env
      .get('OUTBOX_WORKER_RECONNECT_MAX_MS')
      .default('5000')
      .asIntPositive(),
    OUTBOX_WORKER_WATCHDOG_INTERVAL_MS: watchdogIntervalMs,
    OUTBOX_WORKER_STALL_TIMEOUT_MS: stallTimeoutMs,
    watchdog: {
      intervalMs: watchdogIntervalMs,
      stallTimeoutMs
    },
    kafka
  };
}

export type WorkerConfig = ReturnType<typeof loadWorkerConfig>;

let cachedWorkerConfig: WorkerConfig | undefined;

export const getWorkerConfig = (): WorkerConfig => {
  cachedWorkerConfig ??= loadWorkerConfig();
  return cachedWorkerConfig;
};

export const resetWorkerConfigCache = (): void => {
  cachedWorkerConfig = undefined;
};
