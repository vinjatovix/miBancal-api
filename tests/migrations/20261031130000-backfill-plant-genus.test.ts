import type { MigrationDb } from '../../migrations/scripts/20261031130000-backfill-plant-genus.js';
import {
  down,
  up
} from '../../migrations/scripts/20261031130000-backfill-plant-genus.js';

type FakeDocument = {
  _id: string;
  identity: { scientificName: string; genus?: string };
  slug?: string;
  version: number;
  metadata: { updatedAt: string; updatedBy: string };
};

// The migration reads with `{ <path>: { $exists: false } }` to touch only the
// documents still missing a value: a faithful fake must honor that filter so a
// regression dropping the guard (re-writing every document on every run) is
// caught instead of silently passing.
const valueAtPath = (doc: FakeDocument, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => {
    if (typeof acc === 'object' && acc !== null) {
      return (acc as Record<string, unknown>)[key];
    }

    return undefined;
  }, doc);

const matchesFilter = (
  doc: FakeDocument,
  filter: Record<string, unknown>
): boolean =>
  Object.entries(filter).every(([path, condition]) => {
    if (
      typeof condition === 'object' &&
      condition !== null &&
      '$exists' in condition
    ) {
      const exists = valueAtPath(doc, path) !== undefined;

      return exists === (condition as { $exists: boolean }).$exists;
    }

    return true;
  });

const buildFakeDb = (documents: FakeDocument[]) => {
  const stored = documents.map((doc) => ({ ...doc }));

  const find = jest.fn((filter: Record<string, unknown> = {}) => ({
    toArray: jest.fn(() =>
      Promise.resolve(stored.filter((doc) => matchesFilter(doc, filter)))
    )
  }));

  const bulkWrite = jest.fn<
    Promise<unknown>,
    [
      Array<{
        updateOne: {
          filter: Record<string, unknown>;
          update: Record<string, unknown>;
        };
      }>,
      Record<string, unknown>?
    ]
  >(() => Promise.resolve({ modifiedCount: 0 }));

  const updateMany = jest.fn(
    (
      _filter: Record<string, unknown>,
      update: { $unset: Record<string, unknown> }
    ) => {
      for (const doc of stored) {
        for (const key of Object.keys(update.$unset)) {
          if (key === 'identity.genus') {
            delete doc.identity.genus;
          }
          if (key === 'slug') {
            delete doc.slug;
          }
        }
      }
      return Promise.resolve({});
    }
  );

  const collection = { find, bulkWrite, updateMany };
  const db: MigrationDb = { collection: () => collection };

  return { db, stored, find, bulkWrite, updateMany };
};

describe('backfill-plant-genus migration', () => {
  describe('up', () => {
    it('sets identity.genus for plants with derivable genus', async () => {
      const doc: FakeDocument = {
        _id: 'plant-1',
        identity: { scientificName: 'allium sativum' },
        version: 1,
        metadata: { updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'seed' }
      };
      const { db, bulkWrite } = buildFakeDb([doc]);

      await up(db);

      expect(bulkWrite).toHaveBeenCalledWith(
        [
          {
            updateOne: {
              filter: { _id: 'plant-1' },
              update: { $set: { 'identity.genus': 'Allium' } }
            }
          }
        ],
        { ordered: false }
      );
    });

    it('derives no genus for an underivable genus (leading ×) yet still backfills its slug', async () => {
      const doc: FakeDocument = {
        _id: 'hybrid-1',
        identity: { scientificName: '×Brassicoraphanus' },
        version: 1,
        metadata: { updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'seed' }
      };
      const { db, bulkWrite } = buildFakeDb([doc]);

      await up(db);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const ops = bulkWrite.mock.calls.flatMap((call) => call[0]) as Array<{
        updateOne: { update: { $set?: Record<string, unknown> } };
      }>;
      const genusOps = ops.filter(
        (op) => op.updateOne.update.$set?.['identity.genus'] !== undefined
      );
      const slugOps = ops.filter(
        (op) => op.updateOne.update.$set?.slug !== undefined
      );

      expect(genusOps).toHaveLength(0);
      expect(slugOps).toHaveLength(1);
      expect(slugOps[0]?.updateOne.update.$set?.slug).toBe('brassicoraphanus');
    });

    it('does not write version, updatedAt or updatedBy', async () => {
      const doc: FakeDocument = {
        _id: 'plant-2',
        identity: { scientificName: 'ocimum basilicum' },
        version: 3,
        metadata: { updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'original' }
      };
      const { db, bulkWrite } = buildFakeDb([doc]);

      await up(db);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const ops = (bulkWrite.mock.calls[0]?.[0] ?? []) as unknown as Array<{
        updateOne: { update: { $set: Record<string, unknown> } };
      }>;
      const $set = ops[0]?.updateOne.update.$set;

      expect($set).not.toHaveProperty('version');
      expect($set).not.toHaveProperty('metadata.updatedAt');
      expect($set).not.toHaveProperty('metadata.updatedBy');
      expect($set).toEqual({ 'identity.genus': 'Ocimum' });
    });

    it('derives genus matching the shared deriveGenus rule', async () => {
      const cases: Array<{ scientificName: string; expectedGenus: string }> = [
        { scientificName: 'solanum lycopersicum', expectedGenus: 'Solanum' },
        { scientificName: 'lactuca sativa', expectedGenus: 'Lactuca' },
        { scientificName: 'OCIMUM BASILICUM', expectedGenus: 'Ocimum' }
      ];
      const docs: FakeDocument[] = cases.map((c, i) => ({
        _id: `plant-${String(i)}`,
        identity: { scientificName: c.scientificName },
        version: 1,
        metadata: { updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'seed' }
      }));
      const { db, bulkWrite } = buildFakeDb(docs);

      await up(db);

      const ops = (bulkWrite.mock.calls[0]?.[0] ?? []) as unknown as Array<{
        updateOne: {
          filter: { _id: string };
          update: { $set: { 'identity.genus': string } };
        };
      }>;
      for (let i = 0; i < cases.length; i++) {
        expect(ops[i]?.updateOne.update.$set['identity.genus']).toBe(
          cases[i]?.expectedGenus
        );
      }
    });

    it('handles an empty collection without error', async () => {
      const { db, bulkWrite } = buildFakeDb([]);

      await expect(up(db)).resolves.not.toThrow();
      expect(bulkWrite).not.toHaveBeenCalled();
    });

    it('writes nothing when every plant already has genus and slug (idempotent re-run)', async () => {
      const doc: FakeDocument = {
        _id: 'plant-1',
        identity: { scientificName: 'allium sativum', genus: 'Allium' },
        slug: 'allium-sativum',
        version: 1,
        metadata: { updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'seed' }
      };
      const { db, bulkWrite } = buildFakeDb([doc]);

      await up(db);

      expect(bulkWrite).not.toHaveBeenCalled();
    });

    it('backfills only the missing slug when the genus is already set', async () => {
      const doc: FakeDocument = {
        _id: 'plant-1',
        identity: { scientificName: 'allium sativum', genus: 'Allium' },
        version: 1,
        metadata: { updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'seed' }
      };
      const { db, bulkWrite } = buildFakeDb([doc]);

      await up(db);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const ops = bulkWrite.mock.calls.flatMap((call) => call[0]) as Array<{
        updateOne: { update: { $set?: Record<string, unknown> } };
      }>;
      const genusOps = ops.filter(
        (op) => op.updateOne.update.$set?.['identity.genus'] !== undefined
      );
      const slugOps = ops.filter(
        (op) => op.updateOne.update.$set?.slug !== undefined
      );

      expect(genusOps).toHaveLength(0);
      expect(slugOps).toHaveLength(1);
      expect(slugOps[0]?.updateOne.update.$set?.slug).toBe('allium-sativum');
    });
  });

  describe('down', () => {
    it('unsets identity.genus from all plants', async () => {
      const doc: FakeDocument = {
        _id: 'plant-1',
        identity: { scientificName: 'allium sativum', genus: 'Allium' },
        version: 1,
        metadata: { updatedAt: '2026-01-01T00:00:00Z', updatedBy: 'seed' }
      };
      const { db, stored } = buildFakeDb([doc]);

      await down(db);

      expect(stored[0]?.identity).not.toHaveProperty('genus');
    });

    it('calls updateMany unsetting identity.genus and slug', async () => {
      const { db, updateMany } = buildFakeDb([]);

      await down(db);

      expect(updateMany).toHaveBeenCalledWith(
        {},
        { $unset: { 'identity.genus': '', slug: '' } }
      );
    });

    it('does not alter version, updatedAt or updatedBy', async () => {
      const { db, updateMany } = buildFakeDb([]);

      await down(db);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const update = updateMany.mock.calls[0]?.[1] as {
        $unset: Record<string, unknown>;
      };
      expect(update).not.toHaveProperty('$set');
      expect(update.$unset).not.toHaveProperty('version');
      expect(update.$unset).not.toHaveProperty('metadata.updatedAt');
      expect(update.$unset).not.toHaveProperty('metadata.updatedBy');
    });
  });
});
