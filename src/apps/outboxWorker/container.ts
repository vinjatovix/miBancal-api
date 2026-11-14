import {
  asClass,
  asValue,
  type AwilixContainer,
  createContainer,
  InjectionMode
} from 'awilix';
import type { Collection, Db, Document, MongoClient } from 'mongodb';

import type {
  EventForwarder,
  OutboxProgressRepository,
  OutboxTailer
} from '../../Contexts/shared/application/outbox/index.js';
import {
  ChangeStreamOutboxTailer,
  LoggingEventForwarder
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
    outboxTailer: asClass(ChangeStreamOutboxTailer).singleton()
  });

  return container;
}
