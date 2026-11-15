import type { MongoClient } from 'mongodb';

import type {
  CreateWorkerContainerDeps,
  WorkerContainer
} from '../../../src/apps/outboxWorker/container.js';
import { OutboxWorkerApp } from '../../../src/apps/outboxWorker/OutboxWorkerApp.js';
import type { AppLogger } from '../../../src/Contexts/shared/plugins/logger.plugin.js';

const buildLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const WORKER_CONFIG = {
  OUTBOX_WORKER_FALLBACK_BATCH_SIZE: 100,
  OUTBOX_WORKER_RECONNECT_INITIAL_MS: 500,
  OUTBOX_WORKER_RECONNECT_MAX_MS: 5000
};

const buildHarness = () => {
  const tailer = {
    start: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    stop: jest.fn<Promise<void>, []>().mockResolvedValue(undefined)
  };

  const close = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const db = jest.fn().mockReturnValue({});
  const client = { db, close } as unknown as MongoClient;

  const connect = jest.fn<Promise<MongoClient>, []>().mockResolvedValue(client);

  const containerDeps: CreateWorkerContainerDeps[] = [];
  const buildContainer = jest.fn(
    (deps: CreateWorkerContainerDeps): WorkerContainer => {
      containerDeps.push(deps);
      return {
        resolve: jest.fn().mockReturnValue(tailer)
      } as unknown as WorkerContainer;
    }
  );

  const app = new OutboxWorkerApp({
    logger: buildLogger(),
    connect,
    buildContainer,
    workerConfig: WORKER_CONFIG
  });

  return { app, tailer, client, close, connect, buildContainer, containerDeps };
};

describe('OutboxWorkerApp', () => {
  it('connects, builds the container and starts the tailer', async () => {
    const { app, tailer, connect, buildContainer } = buildHarness();

    await app.start();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(buildContainer).toHaveBeenCalledTimes(1);
    expect(tailer.start).toHaveBeenCalledTimes(1);
  });

  it('wires no HTTP/Express dependency into the container', async () => {
    const { app, containerDeps } = buildHarness();

    await app.start();

    expect(
      Object.keys(containerDeps[0] ?? {}).sort((a, b) => a.localeCompare(b))
    ).toEqual(['client', 'db', 'logger', 'workerConfig']);
  });

  it('stops the tailer before closing the Mongo client', async () => {
    const { app, tailer, close } = buildHarness();

    await app.start();
    await app.stop();

    expect(tailer.stop).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    const stopOrder = tailer.stop.mock.invocationCallOrder[0] ?? Infinity;
    const closeOrder = close.mock.invocationCallOrder[0] ?? Infinity;
    expect(stopOrder).toBeLessThan(closeOrder);
  });

  it('is a no-op on stop when never started', async () => {
    const { app, tailer, close } = buildHarness();

    await expect(app.stop()).resolves.toBeUndefined();
    expect(tailer.stop).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
