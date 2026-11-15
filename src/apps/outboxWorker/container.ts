import {
  asClass,
  asFunction,
  asValue,
  type AwilixContainer,
  createContainer,
  InjectionMode
} from 'awilix';
import type { Collection, Db, Document, MongoClient } from 'mongodb';

import type {
  EventForwarder,
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
  LoggingEventForwarder,
  MongoOutboxPendingWorkChecker,
  MonotonicWatchdogClock
} from '../../Contexts/shared/infrastructure/outbox/index.js';
import { MongoOutboxProgressRepository } from '../../Contexts/shared/infrastructure/persistence/mongo/MongoOutboxProgressRepository.js';
import type { AppLogger } from '../../Contexts/shared/plugins/index.js';
import type { WorkerConfig } from './config/workerConfig.js';

export type WorkerContainerCradle = {
  db: Db;
  DBClient: MongoClient;
  outboxCollection: Collection<Document>;
  logger: AppLogger;
  workerConfig: WorkerConfig;
  eventForwarder: EventForwarder;
  outboxProgressRepository: OutboxProgressRepository;
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
    eventForwarder: asClass(LoggingEventForwarder).singleton(),
    outboxProgressRepository: asClass(
      MongoOutboxProgressRepository
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
