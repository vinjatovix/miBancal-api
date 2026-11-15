import { Kafka, logLevel } from 'kafkajs';

import type { WorkerConfig } from '../../../src/apps/outboxWorker/config/workerConfig.js';
import { createWorkerContainer } from '../../../src/apps/outboxWorker/container.js';
import { isConnectableEventForwarder } from '../../../src/Contexts/shared/application/outbox/index.js';
import type { AppLogger } from '../../../src/Contexts/shared/plugins/logger.plugin.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../shared/infrastructure/persistence/mongo/dbTestContext.js';

jest.setTimeout(45_000);

const noopLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
  .split(',')
  .map((broker) => broker.trim());

const TOPIC = `agro.domain.events.app-it-${Date.now()}`;
const PARTITIONS = 6;

const workerConfig = (): WorkerConfig => ({
  OUTBOX_WORKER_FALLBACK_BATCH_SIZE: 100,
  OUTBOX_WORKER_RECONNECT_INITIAL_MS: 500,
  OUTBOX_WORKER_RECONNECT_MAX_MS: 5000,
  OUTBOX_WORKER_WATCHDOG_INTERVAL_MS: 5000,
  OUTBOX_WORKER_STALL_TIMEOUT_MS: 30000,
  watchdog: { intervalMs: 5000, stallTimeoutMs: 30000 },
  kafka: {
    brokers,
    topic: TOPIC,
    clientId: 'agro-outbox-worker-app-it',
    acks: 'all',
    topicPartitions: PARTITIONS,
    replicationFactor: 1,
    producerRetries: 5,
    producerRetryBackoffMs: 300
  }
});

let context: DbTestContext;

beforeAll(async () => {
  context = await createDbTestContext();
});

afterAll(async () => {
  await context.close();
  const admin = new Kafka({
    clientId: 'app-it-cleanup',
    brokers,
    logLevel: logLevel.NOTHING
  }).admin();
  await admin.connect();
  await admin.deleteTopics({ topics: [TOPIC] }).catch(() => undefined);
  await admin.disconnect();
});

describe('OutboxWorkerApp startup wiring (real broker)', () => {
  it('wires a connectable Kafka forwarder that connects and ensures the domain topic with configured partitions', async () => {
    const container = createWorkerContainer({
      db: context.db,
      client: context.client,
      logger: noopLogger(),
      workerConfig: workerConfig()
    });

    const eventForwarder = container.resolve('eventForwarder');
    expect(isConnectableEventForwarder(eventForwarder)).toBe(true);

    if (!isConnectableEventForwarder(eventForwarder)) {
      throw new Error('expected a connectable event forwarder');
    }

    await eventForwarder.connect();

    try {
      const verifyAdmin = new Kafka({
        clientId: 'app-it-verify',
        brokers,
        logLevel: logLevel.NOTHING
      }).admin();
      await verifyAdmin.connect();
      const metadata = await verifyAdmin.fetchTopicMetadata({
        topics: [TOPIC]
      });
      await verifyAdmin.disconnect();

      const topic = metadata.topics.find((entry) => entry.name === TOPIC);
      expect(topic).toBeDefined();
      expect(topic?.partitions).toHaveLength(PARTITIONS);
    } finally {
      await eventForwarder.disconnect();
    }
  });
});
