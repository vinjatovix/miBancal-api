import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261030120000-hierarchical-plant-relations-indexes.js';

const LEGACY_INDEX: [string, Record<string, number>, boolean] = [
  'plant_relations_pair_mechanism_unique',
  { sourcePlantId: 1, targetPlantId: 1, mechanism: 1 },
  true
];

const NEW_INDEXES = [
  [
    'plant_relations_scoped_unique',
    {
      'source.scope': 1,
      'source.value': 1,
      'target.scope': 1,
      'target.value': 1,
      mechanism: 1
    },
    true
  ],
  [
    'plant_relations_source_scoped_idx',
    { 'source.scope': 1, 'source.value': 1 },
    false
  ],
  [
    'plant_relations_target_scoped_idx',
    { 'target.scope': 1, 'target.value': 1 },
    false
  ],
  ['plant_relations_broadcast_idx', { 'target.scope': 1 }, false]
] as const;

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const NAMESPACE_NOT_FOUND = mongoError(26);
const INDEX_NOT_FOUND = mongoError(27);

const buildDb = (initialIndexes: MigrationIndex[] = []) => {
  const stored = new Map(initialIndexes.map((idx) => [idx.name, idx]));

  const indexes = jest.fn((): Promise<MigrationIndex[]> =>
    Promise.resolve([...stored.values()])
  );

  const createIndex = jest.fn(
    (
      key: Record<string, number>,
      options: MigrationIndexOptions
    ): Promise<string> => {
      stored.set(options.name, { key, ...options });
      return Promise.resolve(options.name);
    }
  );

  const dropIndex = jest.fn((name: string): Promise<unknown> =>
    stored.delete(name) ? Promise.resolve() : Promise.reject(INDEX_NOT_FOUND)
  );

  const updateMany = jest.fn((): Promise<unknown> => Promise.resolve({}));

  const collection: MigrationCollection = {
    indexes,
    createIndex,
    dropIndex,
    updateMany
  };

  const db: MigrationDb = {
    collection: () => collection
  };

  return {
    db,
    stored,
    createIndex,
    dropIndex,
    updateMany
  };
};

describe('hierarchical plant_relations indexes migration', () => {
  describe('up', () => {
    it('drops legacy unique index if it exists', async () => {
      const initial: MigrationIndex = {
        name: LEGACY_INDEX[0],
        key: LEGACY_INDEX[1],
        unique: LEGACY_INDEX[2]
      };
      const { db, dropIndex } = buildDb([initial]);

      await up(db);

      expect(dropIndex).toHaveBeenCalledWith(LEGACY_INDEX[0]);
    });

    it.each(NEW_INDEXES)(
      'creates index %s when it does not exist',
      async (name, key, unique) => {
        const { db, createIndex } = buildDb();

        await up(db);

        expect(createIndex).toHaveBeenCalledWith(
          key,
          unique ? { name, unique: true } : { name }
        );
      }
    );

    it.each(NEW_INDEXES)(
      'leaves index %s untouched when definition matches',
      async (name, key, unique) => {
        const initial: MigrationIndex = {
          name,
          key,
          ...(unique && { unique: true })
        };
        const { db, createIndex } = buildDb([initial]);

        await up(db);

        expect(createIndex).not.toHaveBeenCalledWith(key, expect.anything());
      }
    );

    it.each(NEW_INDEXES)(
      'recreates index %s when key differs',
      async (name, key, unique) => {
        const initial: MigrationIndex = {
          name,
          key: { other: 1 },
          ...(unique && { unique: true })
        };
        const { db, createIndex, dropIndex } = buildDb([initial]);

        await up(db);

        expect(dropIndex).toHaveBeenCalledWith(name);
        expect(createIndex).toHaveBeenCalledWith(
          key,
          unique ? { name, unique: true } : { name }
        );
      }
    );

    it('handles missing namespace when listing indexes', async () => {
      const db: MigrationDb = {
        collection: () => ({
          indexes: jest.fn(() => Promise.reject(NAMESPACE_NOT_FOUND)),
          createIndex: jest.fn(() => Promise.resolve('ok')),
          dropIndex: jest.fn(() => Promise.resolve()),
          updateMany: jest.fn(() => Promise.resolve({}))
        })
      };

      await expect(up(db)).resolves.not.toThrow();
    });

    it('backfills scoped source and target on legacy documents before creating indexes', async () => {
      const { db, updateMany, createIndex } = buildDb();

      await up(db);

      expect(updateMany).toHaveBeenCalledWith(
        { source: { $exists: false }, sourcePlantId: { $exists: true } },
        [
          {
            $set: {
              source: { scope: 'plant', value: '$sourcePlantId' },
              target: { scope: 'plant', value: '$targetPlantId' }
            }
          }
        ]
      );
      expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        createIndex.mock.invocationCallOrder[0] as number
      );
    });
  });

  describe('down', () => {
    it.each(NEW_INDEXES)(
      'drops index %s when present',
      async (name, key, unique) => {
        const initial: MigrationIndex = {
          name,
          key,
          ...(unique && { unique: true })
        };
        const { db, dropIndex } = buildDb([initial]);

        await down(db);

        expect(dropIndex).toHaveBeenCalledWith(name);
      }
    );

    it('re-establishes legacy unique index when rolling back', async () => {
      const { db, createIndex } = buildDb();

      await down(db);

      expect(createIndex).toHaveBeenCalledWith(LEGACY_INDEX[1], {
        name: LEGACY_INDEX[0],
        unique: true
      });
    });

    it('leaves legacy unique index untouched if already matching on rollback', async () => {
      const initial: MigrationIndex = {
        name: LEGACY_INDEX[0],
        key: LEGACY_INDEX[1],
        unique: LEGACY_INDEX[2]
      };
      const { db, createIndex } = buildDb([initial]);

      await down(db);

      expect(createIndex).not.toHaveBeenCalledWith(
        LEGACY_INDEX[1],
        expect.anything()
      );
    });
  });
});
