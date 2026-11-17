import { Kafka, logLevel } from 'kafkajs';

import { KafkaMessagePublisher } from '../../../../../src/Contexts/shared/infrastructure/consumers/index.js';
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

const SUFFIX = Date.now();
const RETRY_TOPIC = `agro.domain.events.retry.5s.it-${SUFFIX}`;
const DLQ_TOPIC = `agro.domain.events.dlq.it-${SUFFIX}`;

type ConsumedMessage = {
  topic: string;
  value: string;
  headers: Record<string, string | undefined>;
};

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

const kafka = new Kafka({
  clientId: `kafka-message-publisher-it-${SUFFIX}`,
  brokers,
  logLevel: logLevel.NOTHING
});

const producer = kafka.producer();
const admin = kafka.admin();
const consumer = kafka.consumer({
  groupId: `kafka-message-publisher-it-${SUFFIX}`
});

const publisher = new KafkaMessagePublisher({
  kafkaRetryProducer: producer,
  kafkaRetryAdmin: admin,
  retryTopicPartitions: 1,
  retryReplicationFactor: 1,
  logger: noopLogger()
});

const consumed: ConsumedMessage[] = [];

const decodeHeaders = (
  headers: Record<string, unknown> | undefined
): Record<string, string | undefined> => {
  const decoded: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    decoded[key] = Buffer.isBuffer(value)
      ? value.toString('utf8')
      : String(value);
  }
  return decoded;
};

beforeAll(async () => {
  await publisher.ensureTopics([RETRY_TOPIC, DLQ_TOPIC]);
  await producer.connect();

  await consumer.connect();
  await consumer.subscribe({ topic: RETRY_TOPIC, fromBeginning: true });
  await consumer.subscribe({ topic: DLQ_TOPIC, fromBeginning: true });
  await consumer.run({
    eachMessage: ({ topic, message }) => {
      consumed.push({
        topic,
        value: message.value?.toString('utf8') ?? '',
        headers: decodeHeaders(message.headers)
      });
      return Promise.resolve();
    }
  });
  await sleep(1_000);
});

afterAll(async () => {
  await consumer.disconnect();
  await producer.disconnect();
  const cleanupAdmin = kafka.admin();
  await cleanupAdmin.connect();
  await cleanupAdmin
    .deleteTopics({ topics: [RETRY_TOPIC, DLQ_TOPIC] })
    .catch(() => undefined);
  await cleanupAdmin.disconnect();
});

describe('KafkaMessagePublisher (real broker)', () => {
  it('round-trips headers and a byte-stable envelope value to retry and DLQ topics', async () => {
    const envelope = {
      eventId: '0193a000-0000-7000-8000-000000000010',
      eventName: 'plant.liked',
      aggregateId: 'aggregate-it',
      occurredAt: '2026-11-17T10:00:00.000Z',
      payload: { plantId: 'plant-it' }
    };
    const value = Buffer.from(JSON.stringify(envelope));

    await publisher.send({
      topic: RETRY_TOPIC,
      key: envelope.aggregateId,
      value,
      headers: {
        'x-retry-attempt': '1',
        'x-retry-enqueued-at': '2026-11-17T10:00:00.000Z',
        'x-retry-failing-consumers': 'plant-likes-counter'
      }
    });
    await publisher.send({
      topic: DLQ_TOPIC,
      key: envelope.aggregateId,
      value,
      headers: {
        'x-retry-attempt': '3',
        'x-dlq-dead-lettered-at': '2026-11-17T10:05:00.000Z'
      }
    });

    await waitFor(() => consumed.length >= 2);

    const retryMessage = consumed.find((item) => item.topic === RETRY_TOPIC);
    expect(retryMessage?.value).toBe(JSON.stringify(envelope));
    expect(retryMessage?.headers['x-retry-attempt']).toBe('1');
    expect(retryMessage?.headers['x-retry-failing-consumers']).toBe(
      'plant-likes-counter'
    );

    const dlqMessage = consumed.find((item) => item.topic === DLQ_TOPIC);
    expect(dlqMessage?.value).toBe(JSON.stringify(envelope));
    expect(dlqMessage?.headers['x-dlq-dead-lettered-at']).toBe(
      '2026-11-17T10:05:00.000Z'
    );
  });
});
