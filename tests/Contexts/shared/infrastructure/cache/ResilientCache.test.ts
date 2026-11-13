import type { CacheRepository } from '../../../../../src/Contexts/shared/application/cache/index.js';
import {
  InMemoryCache,
  ResilientCache
} from '../../../../../src/Contexts/shared/infrastructure/cache/index.js';
import { CacheRepositoryFake } from '../../__mocks__/CacheRepositoryFake.js';
import { fakeLogger, type FakeLogger } from '../mailer/fakeLogger.js';

const buildFallback = () =>
  new InMemoryCache({ maxEntries: 50, defaultTtlSeconds: 30 });

const failingPrimary = (): CacheRepository => ({
  get: jest.fn(() => Promise.reject(new Error('redis down'))),
  set: jest.fn(() => Promise.reject(new Error('redis down'))),
  delete: jest.fn(() => Promise.reject(new Error('redis down'))),
  bumpGeneration: jest.fn(() => Promise.reject(new Error('redis down'))),
  currentGeneration: jest.fn(() => Promise.reject(new Error('redis down')))
});

const healthyPrimary = (): CacheRepositoryFake => {
  const fake = new CacheRepositoryFake();
  fake.seed('k', 'primary-value');
  return fake;
};

describe('ResilientCache', () => {
  let logger: FakeLogger;

  beforeEach(() => {
    logger = fakeLogger();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-13T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('abandons a primary call that exceeds the timeout ceiling and serves the fallback', async () => {
    const primary = failingPrimary();
    (primary.get as jest.Mock).mockImplementation(
      () => new Promise(() => undefined)
    );
    const fallback = buildFallback();
    await fallback.set('k', 'from-fallback', 30);
    const cache = new ResilientCache({
      primary,
      fallback,
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30
    });

    const pending = cache.get('k');
    await jest.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBe('from-fallback');
  });

  it('never throws and falls back when the primary errors', async () => {
    const fallback = buildFallback();
    await fallback.set('k', 'safe', 30);
    const cache = new ResilientCache({
      primary: failingPrimary(),
      fallback,
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30
    });

    await expect(cache.get('k')).resolves.toBe('safe');
  });

  it.each([
    {
      description: 'set',
      action: (cache: ResilientCache) => cache.set('k', 'v', 86400)
    },
    {
      description: 'delete',
      action: (cache: ResilientCache) => cache.delete('x')
    },
    {
      description: 'bumpGeneration',
      action: (cache: ResilientCache) => cache.bumpGeneration('plants')
    }
  ])(
    'suppresses primary errors on write operation: $description',
    async ({ action }) => {
      const fallback = buildFallback();
      const cache = new ResilientCache({
        primary: failingPrimary(),
        fallback,
        logger,
        timeoutMs: 50,
        fallbackTtlSeconds: 30
      });

      await expect(action(cache)).resolves.toBeUndefined();
    }
  );

  it('updates the fallback when primary write fails', async () => {
    const fallback = buildFallback();
    const cache = new ResilientCache({
      primary: failingPrimary(),
      fallback,
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30
    });

    await cache.set('k', 'v', 86400);

    await expect(fallback.get('k')).resolves.toBe('v');
  });

  it('caps the fallback TTL so a long catalog TTL cannot pin stale fallback data', async () => {
    const fallback = buildFallback();
    const setSpy = jest.spyOn(fallback, 'set');
    const cache = new ResilientCache({
      primary: failingPrimary(),
      fallback,
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30
    });

    await cache.set('k', 'v', 86400);

    expect(setSpy).toHaveBeenCalledWith('k', 'v', 30);
  });

  it('logs a single warn on degradation, not once per request', async () => {
    const cache = new ResilientCache({
      primary: failingPrimary(),
      fallback: buildFallback(),
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30,
      probeIntervalMs: 2000
    });

    await cache.get('a');
    await cache.get('b');

    expect(logger.warn.mock.calls).toHaveLength(1);
  });

  it('auto-recovers and logs a single info once the primary responds again', async () => {
    let healthy = false;
    const primary = failingPrimary();
    (primary.get as jest.Mock).mockImplementation(() =>
      healthy
        ? Promise.resolve('live')
        : Promise.reject(new Error('redis down'))
    );
    const cache = new ResilientCache({
      primary,
      fallback: buildFallback(),
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30,
      probeIntervalMs: 100
    });

    await cache.get('k');
    healthy = true;
    jest.advanceTimersByTime(101);

    const result = await cache.get('k');

    expect(result).toBe('live');
    expect(logger.info.mock.calls).toHaveLength(1);
  });

  it('does not probe the down primary on every request while degraded', async () => {
    const primary = failingPrimary();
    const getSpy = jest.spyOn(primary, 'get');
    const cache = new ResilientCache({
      primary,
      fallback: buildFallback(),
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30,
      probeIntervalMs: 2000
    });

    await cache.get('a');
    await cache.get('b');
    await cache.get('c');

    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('delegates clear to fallback when clearable', () => {
    const fallback = buildFallback();
    const clearSpy = jest.spyOn(fallback, 'clear');
    const cache = new ResilientCache({
      primary: failingPrimary(),
      fallback,
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30
    });

    cache.clear();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('serves reads directly from primary when healthy without reading fallback', async () => {
    const primary = healthyPrimary();
    const fallback = buildFallback();
    const fallbackGetSpy = jest.spyOn(fallback, 'get');
    const cache = new ResilientCache({
      primary,
      fallback,
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30
    });

    const result = await cache.get('k');

    expect(result).toBe('primary-value');
    expect(primary.getMock).toHaveBeenCalledWith('k');
    expect(fallbackGetSpy).not.toHaveBeenCalled();
  });

  it.each([
    {
      operation: 'set',
      execute: (cache: ResilientCache) => cache.set('k', 'v', 86400),
      assertPrimary: (primary: CacheRepositoryFake) =>
        expect(primary.setMock).toHaveBeenCalledWith('k', 'v', 86400),
      assertFallback: (fallback: InMemoryCache) =>
        expect(fallback.get('k')).resolves.toBe('v')
    },
    {
      operation: 'delete',
      execute: (cache: ResilientCache) => cache.delete('k'),
      assertPrimary: (primary: CacheRepositoryFake) =>
        expect(primary.deleteMock).toHaveBeenCalledWith('k'),
      assertFallback: (fallback: InMemoryCache) =>
        expect(fallback.get('k')).resolves.toBeNull()
    },
    {
      operation: 'bumpGeneration',
      execute: (cache: ResilientCache) => cache.bumpGeneration('catalog'),
      assertPrimary: (primary: CacheRepositoryFake) =>
        expect(primary.bumpGenerationMock).toHaveBeenCalledWith('catalog'),
      assertFallback: (fallback: InMemoryCache) =>
        expect(fallback.currentGeneration('catalog')).resolves.toBe(1)
    }
  ])(
    'writes to both primary and fallback when healthy: $operation',
    async ({ execute, assertPrimary, assertFallback }) => {
      const primary = healthyPrimary();
      const fallback = buildFallback();
      await fallback.set('k', 'initial', 30);
      const cache = new ResilientCache({
        primary,
        fallback,
        logger,
        timeoutMs: 50,
        fallbackTtlSeconds: 30
      });

      await execute(cache);

      assertPrimary(primary);
      await assertFallback(fallback);
    }
  );

  it('reads current generation from primary when healthy', async () => {
    const primary = healthyPrimary();
    await primary.bumpGeneration('catalog');
    const fallback = buildFallback();
    const cache = new ResilientCache({
      primary,
      fallback,
      logger,
      timeoutMs: 50,
      fallbackTtlSeconds: 30
    });

    const result = await cache.currentGeneration('catalog');

    expect(result).toBe(1);
    expect(primary.currentGenerationMock).toHaveBeenCalledWith('catalog');
  });
});
