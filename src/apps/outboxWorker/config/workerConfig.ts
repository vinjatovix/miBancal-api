import dotenv from 'dotenv';
import env from 'env-var';

function loadWorkerConfig() {
  dotenv.config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    override: true,
    quiet: true
  });

  return {
    OUTBOX_WORKER_FALLBACK_BATCH_SIZE: env
      .get('OUTBOX_WORKER_FALLBACK_BATCH_SIZE')
      .default('100')
      .asIntPositive(),
    OUTBOX_WORKER_RECONNECT_INITIAL_MS: env
      .get('OUTBOX_WORKER_RECONNECT_INITIAL_MS')
      .default('500')
      .asIntPositive(),
    OUTBOX_WORKER_RECONNECT_MAX_MS: env
      .get('OUTBOX_WORKER_RECONNECT_MAX_MS')
      .default('5000')
      .asIntPositive()
  };
}

export type WorkerConfig = ReturnType<typeof loadWorkerConfig>;

let cachedWorkerConfig: WorkerConfig | undefined;

export const getWorkerConfig = (): WorkerConfig => {
  cachedWorkerConfig ??= loadWorkerConfig();
  return cachedWorkerConfig;
};

export const resetWorkerConfigCache = (): void => {
  cachedWorkerConfig = undefined;
};
