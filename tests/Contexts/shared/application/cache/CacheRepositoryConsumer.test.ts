import {
  cacheAside,
  type CacheRepository
} from '../../../../../src/Contexts/shared/application/cache/index.js';
import { InMemoryCache } from '../../../../../src/Contexts/shared/infrastructure/cache/index.js';

interface WeatherForecast {
  location: string;
  tempC: number;
  retrievedAt: string;
}

const WEATHER_TTL_SECONDS = 2 * 60 * 60;

describe('CacheRepository as a generic consumer capability', () => {
  const buildCache = (): CacheRepository =>
    new InMemoryCache({ maxEntries: 100, defaultTtlSeconds: 60 });

  it('caches a non-catalog payload with a custom TTL and serves it on repeat', async () => {
    const cache = buildCache();
    const loader = jest.fn((): Promise<WeatherForecast> =>
      Promise.resolve({
        location: 'Madrid',
        tempC: 21,
        retrievedAt: '2026-11-13T10:00:00.000Z'
      })
    );
    const key = 'weather:v1:forecast:madrid';

    const first = await cacheAside(cache, key, WEATHER_TTL_SECONDS, loader);
    const second = await cacheAside(cache, key, WEATHER_TTL_SECONDS, loader);

    expect(first).toEqual(second);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('lets a consumer invalidate its own cached entry', async () => {
    const cache = buildCache();
    await cache.set('weather:v1:forecast:madrid', { tempC: 21 }, 60);

    await cache.delete('weather:v1:forecast:madrid');

    await expect(cache.get('weather:v1:forecast:madrid')).resolves.toBeNull();
  });

  it('lets a consumer advance its own generation counter', async () => {
    const cache = buildCache();

    await cache.bumpGeneration('weather:v1');

    await expect(cache.currentGeneration('weather:v1')).resolves.toBe(1);
  });

  it('keeps generations isolated from any catalog namespace', async () => {
    const cache = buildCache();

    await cache.bumpGeneration('weather:v1');

    await expect(cache.currentGeneration('agro:v1:plants')).resolves.toBe(0);
  });
});
