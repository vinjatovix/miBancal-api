import {
  catalogIdKey,
  catalogListKey,
  catalogNamespace,
  catalogSlugKey,
  hashQuery
} from '../../../../../src/Contexts/shared/application/cache/index.js';

describe('catalogCacheKeys', () => {
  it('builds the per-catalog namespace', () => {
    expect(catalogNamespace('families')).toBe('agro:v1:families');
  });

  it('builds single-entry keys by id and slug', () => {
    expect(catalogIdKey('plants', 'abc-123')).toBe('agro:v1:plants:id:abc-123');
    expect(catalogSlugKey('plants', 'tomato')).toBe(
      'agro:v1:plants:slug:tomato'
    );
  });

  it('embeds the generation in listing keys', () => {
    const key = catalogListKey('anomalies', 7, { page: 1 });

    expect(key.startsWith('agro:v1:anomalies:list:g7:')).toBe(true);
  });

  it('produces different listing keys across generations for the same query', () => {
    const query = { page: 1, limit: 20 };

    expect(catalogListKey('families', 1, query)).not.toBe(
      catalogListKey('families', 2, query)
    );
  });

  it('hashes semantically identical queries to the same value regardless of key order', () => {
    expect(hashQuery({ a: 1, b: 2 })).toBe(hashQuery({ b: 2, a: 1 }));
  });

  it('ignores undefined fields when hashing', () => {
    expect(hashQuery({ a: 1, b: undefined })).toBe(hashQuery({ a: 1 }));
  });

  it('hashes distinct queries to distinct values', () => {
    expect(hashQuery({ page: 1 })).not.toBe(hashQuery({ page: 2 }));
  });

  it('hashes nested structures stably', () => {
    expect(hashQuery({ filter: { x: 1, y: 2 }, sort: ['a'] })).toBe(
      hashQuery({ sort: ['a'], filter: { y: 2, x: 1 } })
    );
  });
});
