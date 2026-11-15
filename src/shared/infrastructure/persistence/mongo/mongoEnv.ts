import env from 'env-var';

import { loadEnvFile } from '../../config/loadEnvFile.js';

export type MongoEnv = {
  MONGO_CONNECTION: string;
  MONGO_URL: string;
  MONGO_APP_NAME: string;
  MONGO_DB: string;
  MONGO_USERNAME: string;
  MONGO_PASSWORD: string;
  MONGO_REPLICA_SET: string;
};

function loadMongoEnv(): MongoEnv {
  loadEnvFile();

  return {
    MONGO_CONNECTION: env.get('MONGO_CONNECTION').required().asString(),
    MONGO_URL: env.get('MONGO_URL').required().asString(),
    MONGO_APP_NAME: env.get('MONGO_APP_NAME').required().asString(),
    MONGO_DB: env.get('MONGO_DB').required().asString(),
    MONGO_USERNAME: env.get('MONGO_USERNAME').required().asString(),
    MONGO_PASSWORD: env.get('MONGO_PASSWORD').required().asString(),
    MONGO_REPLICA_SET: env.get('MONGO_REPLICA_SET').required().asString()
  };
}

let cachedMongoEnv: MongoEnv | undefined;

export const getMongoEnv = (): MongoEnv => {
  cachedMongoEnv ??= loadMongoEnv();
  return cachedMongoEnv;
};

export const resetMongoEnvCache = (): void => {
  cachedMongoEnv = undefined;
};
