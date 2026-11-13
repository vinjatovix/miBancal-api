import type { CacheRepository } from './CacheRepository.js';

const activeLoadersByKey = new Map<string, Promise<unknown>>();

export async function cacheAside<T>(
  cache: CacheRepository,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const existingLoader = activeLoadersByKey.get(key) as Promise<T> | undefined;
  if (existingLoader) {
    return existingLoader;
  }

  const loaderPromise = loadAndStore(cache, key, ttlSeconds, loader);
  activeLoadersByKey.set(key, loaderPromise);
  try {
    return await loaderPromise;
  } finally {
    activeLoadersByKey.delete(key);
  }
}

const loadAndStore = async <T>(
  cache: CacheRepository,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> => {
  const value = await loader();
  await cache.set(key, value, ttlSeconds);
  return value;
};
