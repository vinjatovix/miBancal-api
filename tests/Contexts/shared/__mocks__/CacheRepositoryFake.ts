import type { CacheRepository } from '../../../../src/Contexts/shared/application/cache/index.js';
import type { Nullable } from '../../../../src/shared/domain/types/Nullable.js';

export class CacheRepositoryFake implements CacheRepository {
  public readonly getMock = jest.fn<void, [string]>();
  public readonly setMock = jest.fn<void, [string, unknown, number]>();
  public readonly deleteMock = jest.fn<void, [string]>();
  public readonly bumpGenerationMock = jest.fn<void, [string]>();
  public readonly currentGenerationMock = jest.fn<void, [string]>();

  private readonly store = new Map<string, unknown>();
  private readonly generations = new Map<string, number>();

  public get<T>(key: string): Promise<Nullable<T>> {
    this.getMock(key);
    if (!this.store.has(key)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(structuredClone(this.store.get(key)) as T);
  }

  public set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.setMock(key, value, ttlSeconds);
    this.store.set(key, structuredClone(value));
    return Promise.resolve();
  }

  public delete(key: string): Promise<void> {
    this.deleteMock(key);
    this.store.delete(key);
    return Promise.resolve();
  }

  public bumpGeneration(namespace: string): Promise<void> {
    this.bumpGenerationMock(namespace);
    this.generations.set(namespace, (this.generations.get(namespace) ?? 0) + 1);
    return Promise.resolve();
  }

  public currentGeneration(namespace: string): Promise<number> {
    this.currentGenerationMock(namespace);
    return Promise.resolve(this.generations.get(namespace) ?? 0);
  }

  public seed(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  public has(key: string): boolean {
    return this.store.has(key);
  }
}
