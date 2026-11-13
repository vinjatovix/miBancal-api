import {
  RedisCache,
  type RedisClientLike
} from '../../../../../src/Contexts/shared/infrastructure/cache/RedisCache.js';

const fakeClient = () => {
  const store = new Map<string, string>();
  return {
    store,
    client: {
      get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      set: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve(1);
      }),
      incr: jest.fn((key: string) => {
        const next = (Number(store.get(key)) || 0) + 1;
        store.set(key, String(next));
        return Promise.resolve(next);
      })
    } satisfies RedisClientLike
  };
};

describe('RedisCache', () => {
  it('serializes values with the given TTL on set', async () => {
    const { client } = fakeClient();
    const cache = new RedisCache({ client });

    await cache.set('k', { name: 'rose' }, 86400);

    expect(client.set).toHaveBeenCalledWith(
      'k',
      JSON.stringify({ name: 'rose' }),
      'EX',
      86400
    );
  });

  it('deserializes a stored value on get', async () => {
    const { client } = fakeClient();
    const cache = new RedisCache({ client });
    await cache.set('k', { name: 'rose' }, 60);

    await expect(cache.get('k')).resolves.toEqual({ name: 'rose' });
  });

  it('returns null on a miss', async () => {
    const { client } = fakeClient();
    const cache = new RedisCache({ client });

    await expect(cache.get('missing')).resolves.toBeNull();
  });

  it('deletes a key', async () => {
    const { client } = fakeClient();
    const cache = new RedisCache({ client });
    await cache.set('k', 1, 60);

    await cache.delete('k');

    expect(client.del).toHaveBeenCalledWith('k');
    await expect(cache.get('k')).resolves.toBeNull();
  });

  it('starts the generation counter at zero for an unbumped namespace', async () => {
    const { client } = fakeClient();
    const cache = new RedisCache({ client });

    const generation = await cache.currentGeneration('families');

    expect(generation).toBe(0);
  });

  it('increments the generation counter on bump and reads it back', async () => {
    const { client } = fakeClient();
    const cache = new RedisCache({ client });

    await cache.bumpGeneration('families');
    await cache.bumpGeneration('families');

    expect(client.incr).toHaveBeenCalledWith('families:gen');
    await expect(cache.currentGeneration('families')).resolves.toBe(2);
  });

  it('applies an optional key prefix to every operation', async () => {
    const { client } = fakeClient();
    const cache = new RedisCache({ client, keyPrefix: 'tenant:' });

    await cache.set('k', 1, 60);
    await cache.bumpGeneration('plants');

    expect(client.set).toHaveBeenCalledWith('tenant:k', '1', 'EX', 60);
    expect(client.incr).toHaveBeenCalledWith('tenant:plants:gen');
  });
});
