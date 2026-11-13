import type { Nullable } from '../../../../shared/domain/types/Nullable.js';

export interface CacheRepository {
  get<T>(key: string): Promise<Nullable<T>>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  bumpGeneration(namespace: string): Promise<void>;
  currentGeneration(namespace: string): Promise<number>;
}
