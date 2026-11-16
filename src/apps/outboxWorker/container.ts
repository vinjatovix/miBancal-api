import {
  asClass,
  asFunction,
  asValue,
  type AwilixContainer,
  createContainer,
  InjectionMode
} from 'awilix';
import { type Admin, Kafka, type Producer } from 'kafkajs';
import type { Collection, Db, Document, MongoClient } from 'mongodb';

import type {
  EventForwarder,
  OutboxDispatchRepository,
  OutboxPendingWorkChecker,
  OutboxProgressRepository,
  OutboxTailer,
  WatchdogClock,
  WatchdogScheduler
} from '../../Contexts/shared/application/outbox/index.js';
import { OutboxWatchdog } from '../../Contexts/shared/application/outbox/index.js';
import {
  ChangeStreamOutboxTailer,
  IntervalWatchdogScheduler,
  KafkaEventBusAdapter,
  type KafkaForwarderConfig,
  MongoOutboxPendingWorkChecker,
  MonotonicWatchdogClock
} from '../../Contexts/shared/infrastructure/outbox/index.js';
import { MongoOutboxDispatchRepository } from '../../Contexts/shared/infrastructure/persistence/mongo/MongoOutboxDispatchRepository.js';
import { MongoOutboxProgressRepository } from '../../Contexts/shared/infrastructure/persistence/mongo/MongoOutboxProgressRepository.js';
import type { AppLogger } from '../../Contexts/shared/plugins/index.js';
import type { WorkerConfig } from './config/workerConfig.js';

export type WorkerContainerCradle = {
  db: Db;
  DBClient: MongoClient;
  outboxCollection: Collection<Document>;
  logger: AppLogger;
  workerConfig: WorkerConfig;
  kafka: Kafka;
  kafkaProducer: Producer;
  kafkaAdmin: Admin;
  kafkaConfig: KafkaForwarderConfig;
  eventForwarder: EventForwarder;
  outboxProgressRepository: OutboxProgressRepository;
  outboxDispatchRepository: OutboxDispatchRepository;
  outboxTailer: OutboxTailer;
  clock: WatchdogClock;
  scheduler: WatchdogScheduler;
  pendingChecker: OutboxPendingWorkChecker;
  watchdog: OutboxWatchdog;
};

export type WorkerContainer = AwilixContainer<WorkerContainerCradle>;

export type CreateWorkerContainerDeps = {
  db: Db;
  client: MongoClient;
  logger: AppLogger;
  workerConfig: WorkerConfig;
};

export function createWorkerContainer({
  db,
  client,
  logger,
  workerConfig
}: CreateWorkerContainerDeps): WorkerContainer {
  const container = createContainer<WorkerContainerCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true
  });

  container.register({
    db: asValue(db),
    DBClient: asValue(client),
    outboxCollection: asValue(db.collection<Document>('outbox')),
    logger: asValue(logger),
    workerConfig: asValue(workerConfig),
    kafka: asFunction(
      ({ workerConfig: config }: WorkerContainerCradle) =>
        new Kafka({
          clientId: config.kafka.clientId,
          brokers: config.kafka.brokers,
          retry: {
            retries: config.kafka.producerRetries,
            initialRetryTime: config.kafka.producerRetryBackoffMs
          }
        })
    ).singleton(),
    kafkaProducer: asFunction(({ kafka }: WorkerContainerCradle) =>
      kafka.producer()
    ).singleton(),
    kafkaAdmin: asFunction(({ kafka }: WorkerContainerCradle) =>
      kafka.admin()
    ).singleton(),
    kafkaConfig: asFunction(
      ({
        workerConfig: config
      }: WorkerContainerCradle): KafkaForwarderConfig => ({
        topic: config.kafka.topic,
        acks: config.kafka.acks,
        topicPartitions: config.kafka.topicPartitions,
        replicationFactor: config.kafka.replicationFactor
      })
    ).singleton(),
    eventForwarder: asClass(KafkaEventBusAdapter).singleton(),
    outboxProgressRepository: asClass(
      MongoOutboxProgressRepository
    ).singleton(),
    outboxDispatchRepository: asClass(
      MongoOutboxDispatchRepository
    ).singleton(),
    outboxTailer: asClass(ChangeStreamOutboxTailer).singleton(),
    clock: asClass(MonotonicWatchdogClock).singleton(),
    scheduler: asClass(IntervalWatchdogScheduler).singleton(),
    pendingChecker: asClass(MongoOutboxPendingWorkChecker).singleton(),
    watchdog: asFunction(
      ({
        outboxTailer,
        pendingChecker,
        clock,
        scheduler,
        logger: appLogger,
        workerConfig: config
      }: WorkerContainerCradle) =>
        new OutboxWatchdog({
          tailer: outboxTailer,
          pendingChecker,
          clock,
          scheduler,
          logger: appLogger,
          exit: (code: number) => {
            process.exit(code);
          },
          config: config.watchdog
        })
    ).singleton()
  });

  return container;
}
