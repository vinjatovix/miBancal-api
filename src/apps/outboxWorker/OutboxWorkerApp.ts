import type { MongoClient } from 'mongodb';

import type {
  OutboxTailer,
  OutboxWatchdog
} from '../../Contexts/shared/application/outbox/index.js';
import type { AppLogger } from '../../Contexts/shared/plugins/index.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../shared/infrastructure/persistence/index.js';
import { getWorkerConfig, type WorkerConfig } from './config/workerConfig.js';
import {
  createWorkerContainer,
  type CreateWorkerContainerDeps,
  type WorkerContainer
} from './container.js';

export type OutboxWorkerAppDependencies = {
  logger: AppLogger;
  connect?: () => Promise<MongoClient>;
  buildContainer?: (deps: CreateWorkerContainerDeps) => WorkerContainer;
  workerConfig?: WorkerConfig;
};

export class OutboxWorkerApp {
  private readonly logger: AppLogger;
  private readonly connect: () => Promise<MongoClient>;
  private readonly buildContainer: (
    deps: CreateWorkerContainerDeps
  ) => WorkerContainer;
  private readonly workerConfig: WorkerConfig;

  private client?: MongoClient;
  private tailer?: OutboxTailer;
  private watchdog?: OutboxWatchdog;

  constructor({
    logger,
    connect,
    buildContainer,
    workerConfig
  }: OutboxWorkerAppDependencies) {
    this.logger = logger;
    this.connect =
      connect ??
      (() =>
        DBClientFactory.createClient(
          'outboxWorker',
          DBConfigFactory.createConfig()
        ));
    this.buildContainer = buildContainer ?? createWorkerContainer;
    this.workerConfig = workerConfig ?? getWorkerConfig();
  }

  public async start(): Promise<void> {
    this.client = await this.connect();
    const container = this.buildContainer({
      db: this.client.db(),
      client: this.client,
      logger: this.logger,
      workerConfig: this.workerConfig
    });
    this.tailer = container.resolve('outboxTailer');
    this.watchdog = container.resolve('watchdog');

    this.logger.info('Outbox worker started; tailing the outbox collection');
    const tailerPromise = this.tailer.start();
    this.watchdog.start();
    await tailerPromise;
  }

  public async stop(): Promise<void> {
    if (this.watchdog) {
      this.watchdog.stop();
      this.logger.info('Outbox watchdog stopped');
    }

    if (this.tailer) {
      await this.tailer.stop();
      this.logger.info('Outbox tailer stopped');
    }

    if (this.client) {
      await this.client.close();
      this.logger.info('Outbox worker database connection closed');
    }
  }
}
