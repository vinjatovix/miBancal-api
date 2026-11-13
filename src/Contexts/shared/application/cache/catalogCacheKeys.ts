import { createHash } from 'node:crypto';

export type CatalogName = 'plants' | 'families' | 'anomalies' | 'gardenInputs';

const ROOT = 'agro';
const CACHE_SCHEMA_VERSION = 'v1';

export const catalogNamespace = (catalog: CatalogName): string =>
  `${ROOT}:${CACHE_SCHEMA_VERSION}:${catalog}`;

export const catalogIdKey = (catalog: CatalogName, id: string): string =>
  `${catalogNamespace(catalog)}:id:${id}`;

export const catalogSlugKey = (catalog: CatalogName, slug: string): string =>
  `${catalogNamespace(catalog)}:slug:${slug}`;

export const catalogListKey = (
  catalog: CatalogName,
  generation: number,
  query: unknown
): string =>
  `${catalogNamespace(catalog)}:list:g${generation}:${hashQuery(query)}`;

export const hashQuery = (query: unknown): string =>
  createHash('sha256').update(canonicalize(query)).digest('hex').slice(0, 32);

const canonicalize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
  return `{${entries.join(',')}}`;
};
