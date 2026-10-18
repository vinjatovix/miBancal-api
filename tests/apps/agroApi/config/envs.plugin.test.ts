const ENVS_MODULE =
  '../../../../src/apps/agroApi/config/plugins/envs.plugin.js';

/** Loads the settings from `process.env` alone (no `.env.test` file read). */
const loadEnvs = (): unknown => {
  let loaded: unknown;

  jest.isolateModules(() => {
    jest.doMock('dotenv', () => ({
      __esModule: true,
      default: { config: jest.fn() }
    }));
    const module = jest.requireActual<{ getEnvs: () => unknown }>(ENVS_MODULE);
    loaded = module.getEnvs();
  });

  return loaded;
};

describe('envs plugin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('should load with a Google client id', () => {
    process.env.GOOGLE_CLIENT_ID = 'web-client.apps.googleusercontent.com';

    expect(loadEnvs()).toMatchObject({
      GOOGLE_CLIENT_ID: 'web-client.apps.googleusercontent.com'
    });
  });

  it.each([
    ['empty', ''],
    ['absent', undefined]
  ])('should refuse to load with the Google client id %s', (_case, value) => {
    if (value === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = value;
    }

    expect(loadEnvs).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('should load with the GitHub settings', () => {
    process.env.GITHUB_CLIENT_ID = 'the-client-id';
    process.env.GITHUB_CLIENT_SECRET = 'the-client-secret';

    expect(loadEnvs()).toMatchObject({
      GITHUB_CLIENT_ID: 'the-client-id',
      GITHUB_CLIENT_SECRET: 'the-client-secret'
    });
  });

  it.each([
    ['GITHUB_CLIENT_ID', 'empty', ''],
    ['GITHUB_CLIENT_ID', 'absent', undefined],
    ['GITHUB_CLIENT_SECRET', 'empty', ''],
    ['GITHUB_CLIENT_SECRET', 'absent', undefined],
    ['GITHUB_REDIRECT_URI', 'empty', ''],
    ['GITHUB_REDIRECT_URI', 'absent', undefined]
  ])(
    'should refuse to load with %s %s, naming the setting',
    (key, _case, value) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }

      expect(loadEnvs).toThrow(new RegExp(key));
    }
  );

  describe('caching and resetEnvsCache', () => {
    it('should return the same cached instance on consecutive calls', () => {
      const { getEnvs } = jest.requireActual<{
        getEnvs: () => unknown;
      }>(ENVS_MODULE);

      const firstCall = getEnvs();
      const secondCall = getEnvs();

      expect(secondCall).toBe(firstCall);
    });

    it('should return a new instance after cache reset', () => {
      const { getEnvs, resetEnvsCache } = jest.requireActual<{
        getEnvs: () => unknown;
        resetEnvsCache: () => void;
      }>(ENVS_MODULE);

      const initial = getEnvs();
      resetEnvsCache();
      const reloaded = getEnvs();

      expect(reloaded).not.toBe(initial);
      expect(reloaded).toEqual(initial);
    });
  });
});
