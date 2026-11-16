import { InMemoryCache } from '../../../../../src/Contexts/shared/infrastructure/cache/index.js';

describe('InMemoryCache', () => {
  const buildCache = (
    overrides: Partial<{ maxEntries: number; defaultTtlSeconds: number }> = {}
  ) =>
    new InMemoryCache({
      maxEntries: overrides.maxEntries ?? 10,
      defaultTtlSeconds: overrides.defaultTtlSeconds ?? 30
    });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-13T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null for an unknown key', async () => {
    const cache = buildCache();

    await expect(cache.get('missing')).resolves.toBeNull();
  });

  it('stores and returns a value by key', async () => {
    const cache = buildCache();

    await cache.set('k', { name: 'rose' }, 60);

    await expect(cache.get('k')).resolves.toEqual({ name: 'rose' });
  });

  it('returns a copy so callers cannot mutate cached state', async () => {
    const cache = buildCache();
    await cache.set('k', { tags: ['a'] }, 60);

    const first = (await cache.get<{ tags: string[] }>('k'))!;
    first.tags.push('b');

    await expect(cache.get('k')).resolves.toEqual({ tags: ['a'] });
  });

  it('deletes a key', async () => {
    const cache = buildCache();
    await cache.set('k', 1, 60);

    await cache.delete('k');

    await expect(cache.get('k')).resolves.toBeNull();
  });

  it('expires a value after its TTL elapses', async () => {
    const cache = buildCache();
    await cache.set('k', 'v', 10);

    jest.advanceTimersByTime(10_001);

    await expect(cache.get('k')).resolves.toBeNull();
  });

  it('keeps a value available until its TTL elapses', async () => {
    const cache = buildCache();
    await cache.set('k', 'v', 10);

    jest.advanceTimersByTime(9_000);

    await expect(cache.get('k')).resolves.toBe('v');
  });

  it('evicts the least-recently-used entry once over the cap', async () => {
    const cache = buildCache({ maxEntries: 2 });
    await cache.set('a', 1, 60);
    await cache.set('b', 2, 60);
    await cache.get('a');

    await cache.set('c', 3, 60);

    await expect(cache.get('b')).resolves.toBeNull();
  });

  it('starts a namespace generation at zero', async () => {
    const cache = buildCache();

    const generation = await cache.currentGeneration('families');

    expect(generation).toBe(0);
  });

  it('advances a namespace generation on bump', async () => {
    const cache = buildCache();

    await cache.bumpGeneration('families');
    await cache.bumpGeneration('families');
    const generation = await cache.currentGeneration('families');

    expect(generation).toBe(2);
  });

  it('keeps generations independent per namespace', async () => {
    const cache = buildCache();

    await cache.bumpGeneration('plants');

    await expect(cache.currentGeneration('plants')).resolves.toBe(1);
    await expect(cache.currentGeneration('families')).resolves.toBe(0);
  });
});
