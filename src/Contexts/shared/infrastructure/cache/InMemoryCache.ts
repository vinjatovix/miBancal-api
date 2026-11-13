import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import type { CacheRepository } from '../../application/cache/index.js';

interface StoredEntry {
  value: unknown;
  expiresAt: number;
}

export interface InMemoryCacheOptions {
  maxEntries: number;
  defaultTtlSeconds: number;
}

export class InMemoryCache implements CacheRepository {
  private readonly entries = new Map<string, StoredEntry>();
  private readonly generations = new Map<string, number>();
  private readonly maxEntries: number;
  private readonly defaultTtlSeconds: number;

  constructor({ maxEntries, defaultTtlSeconds }: InMemoryCacheOptions) {
    this.maxEntries = maxEntries;
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  public get<T>(key: string): Promise<Nullable<T>> {
    const entry = this.entries.get(key);
    if (!entry) {
      return Promise.resolve(null);
    }
    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return Promise.resolve(null);
    }
    this.markAsMostRecentlyUsed(key, entry);
    return Promise.resolve(structuredClone(entry.value) as T);
  }

  public set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const ttl = ttlSeconds > 0 ? ttlSeconds : this.defaultTtlSeconds;
    this.entries.delete(key);
    this.entries.set(key, {
      value: structuredClone(value),
      expiresAt: Date.now() + ttl * 1000
    });
    this.evictOverCap();
    return Promise.resolve();
  }

  public delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }

  public bumpGeneration(namespace: string): Promise<void> {
    this.generations.set(namespace, (this.generations.get(namespace) ?? 0) + 1);
    return Promise.resolve();
  }

  public currentGeneration(namespace: string): Promise<number> {
    return Promise.resolve(this.generations.get(namespace) ?? 0);
  }

  public clear(): void {
    this.entries.clear();
    this.generations.clear();
  }

  private isExpired(entry: StoredEntry): boolean {
    return entry.expiresAt <= Date.now();
  }

  private markAsMostRecentlyUsed(key: string, entry: StoredEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
  }

  private evictOverCap(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        return;
      }
      this.entries.delete(oldest);
    }
  }
}
