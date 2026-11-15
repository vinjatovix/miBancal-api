import { Kafka, logLevel } from 'kafkajs';

import type { OutboxRecord } from '../../../../../src/Contexts/shared/application/outbox/index.js';
import { KafkaEventBusAdapter } from '../../../../../src/Contexts/shared/infrastructure/outbox/index.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';

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

const TOPIC = `agro.domain.events.it-${Date.now()}`;
const PARTITIONS = 6;

type ConsumedMessage = { key: string; value: string; partition: number };

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 30_000
): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await sleep(100);
  }
};

const record = (overrides: Partial<OutboxRecord>): OutboxRecord => ({
  eventId: '0193a000-0000-7000-8000-000000000000',
  eventName: 'bed.deleted',
  aggregateId: 'aggregate-shared',
  occurredAt: new Date('2026-11-15T10:00:00.000Z'),
  payload: { bedId: 'bed-shared' },
  createdAt: new Date('2026-11-15T10:00:01.000Z'),
  ...overrides
});

const kafka = new Kafka({
  clientId: 'kafka-adapter-it',
  brokers,
  logLevel: logLevel.NOTHING
});

const producer = kafka.producer();
const admin = kafka.admin();
const consumer = kafka.consumer({ groupId: `kafka-adapter-it-${Date.now()}` });
const adapter = new KafkaEventBusAdapter({
  kafkaProducer: producer,
  kafkaAdmin: admin,
  kafkaConfig: {
    topic: TOPIC,
    acks: 'all',
    topicPartitions: PARTITIONS,
    replicationFactor: 1
  },
  logger: noopLogger()
});

const consumed: ConsumedMessage[] = [];

beforeAll(async () => {
  await adapter.connect();

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
  await consumer.run({
    eachMessage: ({ message, partition }) => {
      consumed.push({
        key: message.key?.toString() ?? '',
        value: message.value?.toString() ?? '',
        partition
      });
      return Promise.resolve();
    }
  });
  // Give the consumer group time to settle before producing.
  await sleep(1_000);
});

afterAll(async () => {
  await consumer.disconnect();
  await adapter.disconnect();
  const cleanupAdmin = kafka.admin();
  await cleanupAdmin.connect();
  await cleanupAdmin.deleteTopics({ topics: [TOPIC] }).catch(() => undefined);
  await cleanupAdmin.disconnect();
});

describe('KafkaEventBusAdapter (real broker)', () => {
  it('publishes the message-envelope contract and keeps same-key events on one partition in order', async () => {
    const first = record({
      eventId: '0193a000-0000-7000-8000-000000000001'
    });
    const second = record({
      eventId: '0193a000-0000-7000-8000-000000000002'
    });
    const other = record({
      eventId: '0193a000-0000-7000-8000-000000000003',
      aggregateId: 'aggregate-other',
      payload: { plantInstanceId: 'plant-instance-other' }
    });

    await adapter.forward(first);
    await adapter.forward(second);
    await adapter.forward(other);

    await waitFor(() => consumed.length >= 3);

    const sharedKey = consumed.filter(
      (message) => message.key === 'bed-shared'
    );
    expect(sharedKey).toHaveLength(2);
    expect(new Set(sharedKey.map((message) => message.partition)).size).toBe(1);
    expect(
      sharedKey.map(
        (message) => (JSON.parse(message.value) as { eventId: string }).eventId
      )
    ).toEqual([
      '0193a000-0000-7000-8000-000000000001',
      '0193a000-0000-7000-8000-000000000002'
    ]);

    const otherKey = consumed.find(
      (message) => message.key === 'plant-instance-other'
    );
    expect(otherKey).toBeDefined();
    expect(JSON.parse(otherKey?.value ?? '{}')).toEqual({
      eventId: '0193a000-0000-7000-8000-000000000003',
      eventName: 'bed.deleted',
      aggregateId: 'aggregate-other',
      occurredAt: '2026-11-15T10:00:00.000Z',
      payload: { plantInstanceId: 'plant-instance-other' }
    });
  });
});
