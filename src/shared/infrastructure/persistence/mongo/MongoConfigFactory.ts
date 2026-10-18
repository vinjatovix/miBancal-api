import { getEnvs } from '../../../../apps/agroApi/config/plugins/envs.plugin.js';
import type { MongoConfig } from './interfaces/MongoConfig.js';

export class MongoConfigFactory {
  private static getRawConfig() {
    const envs = getEnvs();
    return {
      connection: envs.MONGO_CONNECTION,
      url: envs.MONGO_URL,
      db: envs.MONGO_DB,
      username: envs.MONGO_USERNAME,
      password: envs.MONGO_PASSWORD,
      appName: envs.MONGO_APP_NAME,
      replicaSet: envs.MONGO_REPLICA_SET
    };
  }

  static createConfig(): MongoConfig {
    return {
      ...this.getRawConfig(),
      connectionString: MongoConfigFactory.createMongoUri()
    };
  }

  static createMongoUri(): string {
    const { username, password, connection, url, db, appName, replicaSet } =
      this.getRawConfig();
    const encodedPassword = encodeURIComponent(password);
    const credentials =
      username && encodedPassword ? `${username}:${encodedPassword}@` : '';
    const baseConnectionString = `${connection}://${credentials}${url}/${db}`;

    if (connection === 'mongodb+srv') {
      return `${baseConnectionString}?retryWrites=true&w=majority&appName=${appName}`;
    }

    return replicaSet
      ? `${baseConnectionString}?replicaSet=${replicaSet}`
      : baseConnectionString;
  }
}
