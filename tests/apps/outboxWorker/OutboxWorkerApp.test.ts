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
  OUTBOX_WORKER_RECONNECT_MAX_MS: 5000,
  OUTBOX_WORKER_WATCHDOG_INTERVAL_MS: 5000,
  OUTBOX_WORKER_STALL_TIMEOUT_MS: 30000,
  watchdog: {
    intervalMs: 5000,
    stallTimeoutMs: 30000
  }
};

const buildHarness = () => {
  const tailer = {
    start: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    stop: jest.fn<Promise<void>, []>().mockResolvedValue(undefined)
  };

  const watchdog = {
    start: jest.fn<void, []>(),
    stop: jest.fn<void, []>()
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
        resolve: jest.fn().mockImplementation((name: string) => {
          if (name === 'outboxTailer') return tailer;
          if (name === 'watchdog') return watchdog;
          return undefined;
        })
      } as unknown as WorkerContainer;
    }
  );

  const app = new OutboxWorkerApp({
    logger: buildLogger(),
    connect,
    buildContainer,
    workerConfig: WORKER_CONFIG
  });

  return {
    app,
    tailer,
    watchdog,
    client,
    close,
    connect,
    buildContainer,
    containerDeps
  };
};

describe('OutboxWorkerApp', () => {
  it('connects, builds the container, starts the tailer and arms the watchdog', async () => {
    const { app, tailer, watchdog, connect, buildContainer } = buildHarness();

    await app.start();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(buildContainer).toHaveBeenCalledTimes(1);
    expect(tailer.start).toHaveBeenCalledTimes(1);
    expect(watchdog.start).toHaveBeenCalledTimes(1);
    const tailerOrder = tailer.start.mock.invocationCallOrder[0] ?? Infinity;
    const watchdogOrder =
      watchdog.start.mock.invocationCallOrder[0] ?? Infinity;
    expect(tailerOrder).toBeLessThan(watchdogOrder);
  });

  it('wires no HTTP/Express dependency into the container', async () => {
    const { app, containerDeps } = buildHarness();

    await app.start();

    expect(
      Object.keys(containerDeps[0] ?? {}).sort((a, b) => a.localeCompare(b))
    ).toEqual(['client', 'db', 'logger', 'workerConfig']);
  });

  it('stops the watchdog before stopping the tailer and closing the Mongo client', async () => {
    const { app, tailer, watchdog, close } = buildHarness();

    await app.start();
    await app.stop();

    expect(watchdog.stop).toHaveBeenCalledTimes(1);
    expect(tailer.stop).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    const watchdogStopOrder =
      watchdog.stop.mock.invocationCallOrder[0] ?? Infinity;
    const tailerStopOrder = tailer.stop.mock.invocationCallOrder[0] ?? Infinity;
    const closeOrder = close.mock.invocationCallOrder[0] ?? Infinity;
    expect(watchdogStopOrder).toBeLessThan(tailerStopOrder);
    expect(tailerStopOrder).toBeLessThan(closeOrder);
  });

  it('is a no-op on stop when never started', async () => {
    const { app, tailer, watchdog, close } = buildHarness();

    await expect(app.stop()).resolves.toBeUndefined();
    expect(watchdog.stop).not.toHaveBeenCalled();
    expect(tailer.stop).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
