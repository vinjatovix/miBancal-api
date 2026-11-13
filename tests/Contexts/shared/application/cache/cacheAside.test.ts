import { cacheAside } from '../../../../../src/Contexts/shared/application/cache/index.js';
import { InMemoryCache } from '../../../../../src/Contexts/shared/infrastructure/cache/index.js';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('cacheAside', () => {
  const buildCache = () =>
    new InMemoryCache({ maxEntries: 50, defaultTtlSeconds: 30 });

  it('returns the cached value without calling the loader on a hit', async () => {
    const cache = buildCache();
    await cache.set('hit-key', { id: 1 }, 60);
    const loader = jest.fn(() => Promise.resolve({ id: 2 }));

    const result = await cacheAside(cache, 'hit-key', 60, loader);

    expect(result).toEqual({ id: 1 });
    expect(loader).not.toHaveBeenCalled();
  });

  it('runs the loader on a miss, stores the result, and returns it', async () => {
    const cache = buildCache();
    const loader = jest.fn(() => Promise.resolve({ id: 42 }));

    const result = await cacheAside(cache, 'miss-key', 60, loader);

    expect(result).toEqual({ id: 42 });
    expect(loader).toHaveBeenCalledTimes(1);
    await expect(cache.get('miss-key')).resolves.toEqual({ id: 42 });
  });

  it('does not run the loader again once the value is cached', async () => {
    const cache = buildCache();
    const loader = jest.fn(() => Promise.resolve({ id: 7 }));

    await cacheAside(cache, 'warm-key', 60, loader);
    await cacheAside(cache, 'warm-key', 60, loader);

    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('propagates a loader rejection and does not cache it', async () => {
    const cache = buildCache();
    const failing = jest.fn(() => Promise.reject(new Error('db down')));

    await expect(cacheAside(cache, 'fail-key', 60, failing)).rejects.toThrow(
      'db down'
    );
    await expect(cache.get('fail-key')).resolves.toBeNull();

    const ok = jest.fn(() => Promise.resolve({ id: 1 }));
    await expect(cacheAside(cache, 'fail-key', 60, ok)).resolves.toEqual({
      id: 1
    });
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent cold reads of the same key into one loader run', async () => {
    const cache = buildCache();
    let resolveLoader: (value: { id: number }) => void = () => undefined;
    const loaderPromise = new Promise<{ id: number }>((resolve) => {
      resolveLoader = resolve;
    });
    const loader = jest.fn(() => loaderPromise);

    const first = cacheAside(cache, 'cold-key', 60, loader);
    const second = cacheAside(cache, 'cold-key', 60, loader);
    await flush();

    resolveLoader({ id: 99 });
    const [a, b] = await Promise.all([first, second]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ id: 99 });
    expect(b).toEqual({ id: 99 });
  });
});
