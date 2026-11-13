import { Redis } from 'ioredis';

import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import type { CacheRepository } from '../../application/cache/index.js';
import type { AppLogger } from '../../plugins/index.js';
import { InMemoryCache } from './InMemoryCache.js';
import { RedisCache, type RedisClientLike } from './RedisCache.js';
import { ResilientCache } from './ResilientCache.js';

export interface CacheSettings {
  enabled: boolean;
  redisUrl: string;
  backendTimeoutMs: number;
  fallbackTtlSeconds: number;
  fallbackMaxEntries: number;
}

export interface CreateCacheDeps {
  settings: CacheSettings;
  logger: AppLogger;
  redisClientFactory?: (
    url: string,
    commandTimeoutMs: number
  ) => RedisClientLike;
}

class NoOpCache implements CacheRepository {
  public get<T>(): Promise<Nullable<T>> {
    return Promise.resolve(null);
  }
  public set(): Promise<void> {
    return Promise.resolve();
  }
  public delete(): Promise<void> {
    return Promise.resolve();
  }
  public bumpGeneration(): Promise<void> {
    return Promise.resolve();
  }
  public currentGeneration(): Promise<number> {
    return Promise.resolve(0);
  }
}

const createDefaultRedisClientFactory =
  (logger: AppLogger) =>
  (url: string, commandTimeoutMs: number): RedisClientLike => {
    const client = new Redis(url, {
      // Railway's private network (*.railway.internal) is IPv6-only; family 0
      // lets DNS resolve either stack instead of ioredis' IPv4-only default.
      family: 0,
      lazyConnect: true,
      commandTimeout: commandTimeoutMs,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
    let hasLoggedError = false;
    client.on('error', (error: Error) => {
      if (!hasLoggedError) {
        hasLoggedError = true;
        logger.warn('Redis cache client connection error', error);
      }
    });
    return client;
  };

export function createCache({
  settings,
  logger,
  redisClientFactory
}: CreateCacheDeps): CacheRepository {
  const isCachingDisabled = !settings.enabled;
  if (isCachingDisabled) {
    return new NoOpCache();
  }

  const fallback = new InMemoryCache({
    maxEntries: settings.fallbackMaxEntries,
    defaultTtlSeconds: settings.fallbackTtlSeconds
  });

  const isInMemoryOnlyMode = settings.redisUrl === '';
  if (isInMemoryOnlyMode) {
    return fallback;
  }

  const factory = redisClientFactory ?? createDefaultRedisClientFactory(logger);
  const client = factory(settings.redisUrl, settings.backendTimeoutMs);
  return new ResilientCache({
    primary: new RedisCache({ client }),
    fallback,
    logger,
    timeoutMs: settings.backendTimeoutMs,
    fallbackTtlSeconds: settings.fallbackTtlSeconds
  });
}
