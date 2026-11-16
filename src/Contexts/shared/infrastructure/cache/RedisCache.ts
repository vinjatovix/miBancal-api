import type { Nullable } from '../../../../shared/domain/types/Nullable.js';
import type { CacheRepository } from '../../application/cache/index.js';

export interface RedisClientLike {
  get(key: string): Promise<Nullable<string>>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
}

export interface RedisCacheOptions {
  client: RedisClientLike;
  keyPrefix?: string;
}

export class RedisCache implements CacheRepository {
  private readonly client: RedisClientLike;
  private readonly keyPrefix: string;

  constructor({ client, keyPrefix = '' }: RedisCacheOptions) {
    this.client = client;
    this.keyPrefix = keyPrefix;
  }

  public async get<T>(key: string): Promise<Nullable<T>> {
    const raw = await this.client.get(this.prefixed(key));
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  public async set<T>(
    key: string,
    value: T,
    ttlSeconds: number
  ): Promise<void> {
    await this.client.set(
      this.prefixed(key),
      JSON.stringify(value),
      'EX',
      ttlSeconds
    );
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(this.prefixed(key));
  }

  public async bumpGeneration(namespace: string): Promise<void> {
    await this.client.incr(this.generationKey(namespace));
  }

  public async currentGeneration(namespace: string): Promise<number> {
    const raw = await this.client.get(this.generationKey(namespace));
    const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private prefixed(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private generationKey(namespace: string): string {
    return this.prefixed(`${namespace}:gen`);
  }
}
