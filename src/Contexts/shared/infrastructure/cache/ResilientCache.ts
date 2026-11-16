import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import type { CacheRepository } from '../../application/cache/index.js';
import type { AppLogger } from '../../plugins/index.js';

export interface ResilientCacheOptions {
  primary: CacheRepository;
  fallback: CacheRepository;
  logger: AppLogger;
  timeoutMs: number;
  fallbackTtlSeconds: number;
  probeIntervalMs?: number;
}

const DEFAULT_PROBE_INTERVAL_MS = 2000;

export class ResilientCache implements CacheRepository {
  private readonly primary: CacheRepository;
  private readonly fallback: CacheRepository;
  private readonly logger: AppLogger;
  private readonly timeoutMs: number;
  private readonly fallbackTtlSeconds: number;
  private readonly probeIntervalMs: number;

  private healthy = true;
  private lastProbeAt = 0;

  constructor({
    primary,
    fallback,
    logger,
    timeoutMs,
    fallbackTtlSeconds,
    probeIntervalMs = DEFAULT_PROBE_INTERVAL_MS
  }: ResilientCacheOptions) {
    this.primary = primary;
    this.fallback = fallback;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.fallbackTtlSeconds = fallbackTtlSeconds;
    this.probeIntervalMs = probeIntervalMs;
  }

  public async get<T>(key: string): Promise<Nullable<T>> {
    const attempt = await this.tryPrimary((cache) => cache.get<T>(key));
    if (attempt.ok) {
      return attempt.value;
    }
    return this.fallback.get<T>(key);
  }

  public async set<T>(
    key: string,
    value: T,
    ttlSeconds: number
  ): Promise<void> {
    await this.tryPrimary((cache) => cache.set(key, value, ttlSeconds));
    await this.fallback.set(
      key,
      value,
      Math.min(ttlSeconds, this.fallbackTtlSeconds)
    );
  }

  public async delete(key: string): Promise<void> {
    await this.tryPrimary((cache) => cache.delete(key));
    await this.fallback.delete(key);
  }

  public async bumpGeneration(namespace: string): Promise<void> {
    await this.tryPrimary((cache) => cache.bumpGeneration(namespace));
    await this.fallback.bumpGeneration(namespace);
  }

  public async currentGeneration(namespace: string): Promise<number> {
    const attempt = await this.tryPrimary((cache) =>
      cache.currentGeneration(namespace)
    );
    if (attempt.ok) {
      return attempt.value;
    }
    return this.fallback.currentGeneration(namespace);
  }

  public clear(): void {
    if (
      'clear' in this.fallback &&
      typeof (this.fallback as { clear?: () => void }).clear === 'function'
    ) {
      (this.fallback as { clear: () => void }).clear();
    }
  }

  private async tryPrimary<R>(
    op: (cache: CacheRepository) => Promise<R>
  ): Promise<{ ok: true; value: R } | { ok: false }> {
    if (!this.shouldAttemptPrimary()) {
      return { ok: false };
    }
    try {
      const value = await this.withTimeout(op(this.primary));
      this.markHealthy();
      return { ok: true, value };
    } catch (error) {
      this.markDegraded(error);
      return { ok: false };
    }
  }

  private shouldAttemptPrimary(): boolean {
    if (this.healthy) {
      return true;
    }
    const now = Date.now();
    if (now - this.lastProbeAt < this.probeIntervalMs) {
      return false;
    }
    this.lastProbeAt = now;
    return true;
  }

  private markHealthy(): void {
    if (!this.healthy) {
      this.healthy = true;
      this.logger.info('Cache backend recovered; resuming primary cache');
    }
  }

  private markDegraded(error: unknown): void {
    this.lastProbeAt = Date.now();
    if (this.healthy) {
      this.healthy = false;
      this.logger.warn(
        'Cache backend unavailable; serving from in-memory fallback',
        error
      );
    }
  }

  private withTimeout<R>(promise: Promise<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('cache backend timeout'));
      }, this.timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      );
    });
  }
}
