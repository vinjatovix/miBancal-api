import type { OutboxRecord } from '../../../../../src/Contexts/shared/application/outbox/index.js';
import {
  KafkaEventBusAdapter,
  type KafkaForwarderConfig
} from '../../../../../src/Contexts/shared/infrastructure/outbox/index.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';

const buildLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const CONFIG: KafkaForwarderConfig = {
  topic: 'agro.domain.events',
  acks: 'all',
  topicPartitions: 6,
  replicationFactor: 1
};

const buildProducer = () => ({
  connect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  disconnect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  send: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue([])
});

const buildAdmin = () => ({
  connect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  disconnect: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
  listTopics: jest.fn<Promise<string[]>, []>().mockResolvedValue([]),
  createTopics: jest.fn<Promise<boolean>, [unknown]>().mockResolvedValue(true)
});

const buildAdapter = (
  producer: ReturnType<typeof buildProducer>,
  admin: ReturnType<typeof buildAdmin>,
  config: KafkaForwarderConfig = CONFIG
): KafkaEventBusAdapter =>
  new KafkaEventBusAdapter({
    kafkaProducer: producer,
    kafkaAdmin: admin,
    kafkaConfig: config,
    logger: buildLogger()
  });

const record = (overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
  eventId: '0193a000-0000-7000-8000-000000000001',
  eventName: 'bed.deleted',
  aggregateId: 'aggregate-7',
  occurredAt: new Date('2026-11-15T10:00:00.000Z'),
  payload: { bedId: 'bed-9' },
  createdAt: new Date('2026-11-15T10:00:01.000Z'),
  ...overrides
});

describe('KafkaEventBusAdapter', () => {
  describe('forward', () => {
    it('publishes to the configured topic with the derived key and unaltered value', async () => {
      const producer = buildProducer();
      const adapter = buildAdapter(producer, buildAdmin());

      await adapter.forward(record());

      expect(producer.send).toHaveBeenCalledTimes(1);
      const sent = producer.send.mock.calls[0]?.[0] as {
        topic: string;
        acks: number;
        messages: { key: string; value: string }[];
      };
      expect(sent.topic).toBe('agro.domain.events');
      expect(sent.acks).toBe(-1);
      expect(sent.messages[0]?.key).toBe('bed-9');
      expect(JSON.parse(sent.messages[0]?.value ?? '{}')).toEqual({
        eventId: '0193a000-0000-7000-8000-000000000001',
        eventName: 'bed.deleted',
        aggregateId: 'aggregate-7',
        occurredAt: '2026-11-15T10:00:00.000Z',
        payload: { bedId: 'bed-9' }
      });
    });

    it('resolves only after the producer acknowledges durable receipt', async () => {
      const producer = buildProducer();
      let releaseAck!: () => void;
      const ack = new Promise<unknown>((resolve) => {
        releaseAck = () => resolve([]);
      });
      producer.send.mockReturnValue(ack);
      const adapter = buildAdapter(producer, buildAdmin());

      let resolved = false;
      const forwarded = adapter.forward(record()).then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);

      releaseAck();
      await forwarded;
      expect(resolved).toBe(true);
    });

    it('rejects when the producer fails to publish', async () => {
      const producer = buildProducer();
      producer.send.mockRejectedValue(new Error('broker unavailable'));
      const adapter = buildAdapter(producer, buildAdmin());

      await expect(adapter.forward(record())).rejects.toThrow(
        'broker unavailable'
      );
    });

    it('maps acks "0" and "1" to their numeric levels', async () => {
      const producerZero = buildProducer();
      await buildAdapter(producerZero, buildAdmin(), {
        ...CONFIG,
        acks: '0'
      }).forward(record());
      expect(
        (producerZero.send.mock.calls[0]?.[0] as { acks: number }).acks
      ).toBe(0);

      const producerOne = buildProducer();
      await buildAdapter(producerOne, buildAdmin(), {
        ...CONFIG,
        acks: '1'
      }).forward(record());
      expect(
        (producerOne.send.mock.calls[0]?.[0] as { acks: number }).acks
      ).toBe(1);
    });
  });

  describe('connect', () => {
    it('connects the producer and creates the absent topic with configured partitions and replication factor', async () => {
      const producer = buildProducer();
      const admin = buildAdmin();
      const adapter = buildAdapter(producer, admin, {
        ...CONFIG,
        replicationFactor: 3
      });

      await adapter.connect();

      expect(producer.connect).toHaveBeenCalledTimes(1);
      expect(admin.listTopics).toHaveBeenCalledTimes(1);
      expect(admin.createTopics).toHaveBeenCalledWith({
        topics: [
          {
            topic: 'agro.domain.events',
            numPartitions: 6,
            replicationFactor: 3
          }
        ]
      });
      expect(admin.disconnect).toHaveBeenCalledTimes(1);
    });

    it('skips creation when the topic already exists', async () => {
      const admin = buildAdmin();
      admin.listTopics.mockResolvedValue(['agro.domain.events']);
      const adapter = buildAdapter(buildProducer(), admin);

      await expect(adapter.connect()).resolves.toBeUndefined();
      expect(admin.createTopics).not.toHaveBeenCalled();
      expect(admin.disconnect).toHaveBeenCalledTimes(1);
    });

    it('never blocks startup when topic administration is denied', async () => {
      const producer = buildProducer();
      const admin = buildAdmin();
      admin.createTopics.mockRejectedValue(
        new Error('TOPIC_AUTHORIZATION_FAILED')
      );
      const adapter = buildAdapter(producer, admin);

      await expect(adapter.connect()).resolves.toBeUndefined();
      expect(producer.connect).toHaveBeenCalledTimes(1);
      expect(admin.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('disconnects the producer', async () => {
      const producer = buildProducer();
      const adapter = buildAdapter(producer, buildAdmin());

      await adapter.disconnect();

      expect(producer.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
