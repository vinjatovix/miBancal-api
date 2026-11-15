import env from 'env-var';

import { loadEnvFile } from '../../../shared/infrastructure/config/loadEnvFile.js';

export type LoggerEnv = {
  NODE_ENV: string;
  TEST_LOGS: boolean;
};

function loadLoggerEnv(): LoggerEnv {
  loadEnvFile();

  return {
    NODE_ENV: env.get('NODE_ENV').required().asString(),
    TEST_LOGS: env.get('TEST_LOGS').default('false').asBool()
  };
}

let cachedLoggerEnv: LoggerEnv | undefined;

export const getLoggerEnv = (): LoggerEnv => {
  cachedLoggerEnv ??= loadLoggerEnv();
  return cachedLoggerEnv;
};

export const resetLoggerEnvCache = (): void => {
  cachedLoggerEnv = undefined;
};
