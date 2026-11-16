import {
  createCache,
  type CacheSettings
} from '../../../../../src/Contexts/shared/infrastructure/cache/createCache.js';
import type { RedisClientLike } from '../../../../../src/Contexts/shared/infrastructure/cache/RedisCache.js';
import { fakeLogger } from '../mailer/fakeLogger.js';

const settings = (overrides: Partial<CacheSettings> = {}): CacheSettings => ({
  enabled: true,
  redisUrl: '',
  backendTimeoutMs: 50,
  fallbackTtlSeconds: 30,
  fallbackMaxEntries: 1000,
  ...overrides
});

const fakeRedisClient = () => {
  const store = new Map<string, string>();
  const get = jest.fn((key: string) => Promise.resolve(store.get(key) ?? null));
  const set = jest.fn(
    (key: string, value: string, _mode: 'EX', _ttl: number) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }
  );
  const del = jest.fn((key: string) => {
    store.delete(key);
    return Promise.resolve(1);
  });
  const incr = jest.fn((key: string) => {
    const next = (Number(store.get(key)) || 0) + 1;
    store.set(key, String(next));
    return Promise.resolve(next);
  });

  return {
    client: { get, set, del, incr } satisfies RedisClientLike,
    get,
    set,
    del,
    incr
  };
};

describe('createCache', () => {
  it('returns a no-op cache when caching is disabled', async () => {
    const factory = jest.fn();
    const cache = createCache({
      settings: settings({ enabled: false }),
      logger: fakeLogger(),
      redisClientFactory: factory
    });

    await cache.set('k', 'v', 60);

    await expect(cache.get('k')).resolves.toBeNull();
    expect(factory).not.toHaveBeenCalled();
  });

  it('returns an in-memory-only cache when REDIS_URL is empty', async () => {
    const factory = jest.fn();
    const cache = createCache({
      settings: settings({ redisUrl: '' }),
      logger: fakeLogger(),
      redisClientFactory: factory
    });

    await cache.set('k', 'v', 60);

    await expect(cache.get('k')).resolves.toBe('v');
    expect(factory).not.toHaveBeenCalled();
  });

  it('builds a Redis-backed resilient cache when REDIS_URL is set', async () => {
    const { client, set: redisSet, get: redisGet } = fakeRedisClient();
    const factory = jest.fn(() => client);
    const cache = createCache({
      settings: settings({ redisUrl: 'redis://cache:6379' }),
      logger: fakeLogger(),
      redisClientFactory: factory
    });

    await cache.set('k', 'v', 60);
    const result = await cache.get('k');

    expect(factory).toHaveBeenCalledWith('redis://cache:6379', 50);
    expect(redisSet).toHaveBeenCalledWith('k', JSON.stringify('v'), 'EX', 60);
    expect(redisGet).toHaveBeenCalledWith('k');
    expect(result).toBe('v');
  });
});
