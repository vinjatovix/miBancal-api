import * as envsPlugin from '../../../../../src/apps/agroApi/config/plugins/envs.plugin.js';
import { MongoConfigFactory } from '../../../../../src/shared/infrastructure/persistence/mongo/MongoConfigFactory.js';

describe('MongoConfigFactory', () => {
  const originalGetEnvs = envsPlugin.getEnvs;

  const mockEnvironment = (
    overrides: Partial<ReturnType<typeof envsPlugin.getEnvs>>
  ) => {
    jest.spyOn(envsPlugin, 'getEnvs').mockReturnValue({
      ...originalGetEnvs(),
      ...overrides
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createConfig', () => {
    it('should build configuration mapping all environment fields with connection string', () => {
      mockEnvironment({
        MONGO_CONNECTION: 'mongodb',
        MONGO_URL: 'mongo.host:27017',
        MONGO_DB: 'agro_test_db',
        MONGO_USERNAME: 'test_user',
        MONGO_PASSWORD: 'test_password',
        MONGO_APP_NAME: 'agro_test_app',
        MONGO_REPLICA_SET: 'rs0'
      });

      const config = MongoConfigFactory.createConfig();

      expect(config).toEqual({
        connection: 'mongodb',
        url: 'mongo.host:27017',
        db: 'agro_test_db',
        username: 'test_user',
        password: 'test_password',
        appName: 'agro_test_app',
        replicaSet: 'rs0',
        connectionString:
          'mongodb://test_user:test_password@mongo.host:27017/agro_test_db?replicaSet=rs0'
      });
    });
  });

  describe('createMongoUri', () => {
    it.each([
      [
        'mongodb without credentials or replica set',
        {
          MONGO_CONNECTION: 'mongodb',
          MONGO_URL: 'localhost:27017',
          MONGO_DB: 'agro_db',
          MONGO_USERNAME: '',
          MONGO_PASSWORD: '',
          MONGO_APP_NAME: '',
          MONGO_REPLICA_SET: ''
        },
        'mongodb://localhost:27017/agro_db'
      ],
      [
        'mongodb with URL-encoded special characters in password',
        {
          MONGO_CONNECTION: 'mongodb',
          MONGO_URL: 'localhost:27017',
          MONGO_DB: 'agro_db',
          MONGO_USERNAME: 'admin',
          MONGO_PASSWORD: 'p@ss:word#123',
          MONGO_APP_NAME: '',
          MONGO_REPLICA_SET: ''
        },
        'mongodb://admin:p%40ss%3Aword%23123@localhost:27017/agro_db'
      ],
      [
        'mongodb with replica set',
        {
          MONGO_CONNECTION: 'mongodb',
          MONGO_URL: 'cluster0.host:27017',
          MONGO_DB: 'agro_db',
          MONGO_USERNAME: '',
          MONGO_PASSWORD: '',
          MONGO_APP_NAME: '',
          MONGO_REPLICA_SET: 'rsCluster'
        },
        'mongodb://cluster0.host:27017/agro_db?replicaSet=rsCluster'
      ],
      [
        'mongodb+srv connection with appName and retryWrites',
        {
          MONGO_CONNECTION: 'mongodb+srv',
          MONGO_URL: 'cluster0.mongodb.net',
          MONGO_DB: 'agro_production',
          MONGO_USERNAME: 'db_admin',
          MONGO_PASSWORD: 'secure_password',
          MONGO_APP_NAME: 'agroAtlasApp',
          MONGO_REPLICA_SET: ''
        },
        'mongodb+srv://db_admin:secure_password@cluster0.mongodb.net/agro_production?retryWrites=true&w=majority&appName=agroAtlasApp'
      ]
    ])('should build %s', (_description, envOverrides, expectedUri) => {
      mockEnvironment(envOverrides);

      const uri = MongoConfigFactory.createMongoUri();

      expect(uri).toBe(expectedUri);
    });
  });
});
