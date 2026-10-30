import { asClass, asValue } from 'awilix';
import type { Db } from 'mongodb';
import { up } from '../../../../../../migrations/scripts/20261028120000-create-plant-relations-collection.js';
import type { PlantRelationMechanism } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationMechanism.js';
import { createPlantRelationId } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import type { PlantRelationRepository } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/repositories/interfaces/PlantRelationRepository.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { MongoPlantRelationRepository } from '../../../../../../src/Contexts/Agro/PlantRelations/infrastructure/persistence/MongoPlantRelationRepository.js';
import { plantRelationPersistenceMapper } from '../../../../../../src/Contexts/Agro/PlantRelations/mappers/plantRelationPersistenceMapper.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/DomainConflictException.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { PlantRelationMother } from '../../domain/mothers/PlantRelationMother.js';

describe('MongoPlantRelationRepository (db)', () => {
  let context: DbTestContext;
  let db: Db;
  let repository: PlantRelationRepository;

  const TOMATO_ID = createPlantId('0192e200-0000-7000-8000-000000000001');
  const BASIL_ID = createPlantId('0192e200-0000-7000-8000-000000000002');
  const PEPPER_ID = createPlantId('0192e200-0000-7000-8000-000000000003');
  const FENNEL_ID = createPlantId('0192e200-0000-7000-8000-000000000004');
  const CORN_ID = createPlantId('0192e200-0000-7000-8000-000000000005');
  const BEAN_ID = createPlantId('0192e200-0000-7000-8000-000000000006');
  const SQUASH_ID = createPlantId('0192e200-0000-7000-8000-000000000007');
  const UNRELATED_ID = createPlantId('0192e200-0000-7000-8000-000000000099');

  const REL_BASIL_TOMATO = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000001'
  );
  const REL_BASIL_PEPPER = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000002'
  );
  const REL_FENNEL_TOMATO = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000003'
  );
  const REL_CORN_BEAN = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000004'
  );
  const REL_BEAN_CORN = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000005'
  );
  const REL_SQUASH_CORN = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000006'
  );
  const REL_BEAN_SQUASH = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000007'
  );
  const REL_CORN_TOMATO = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000008'
  );
  const REL_TOMATO_BASIL = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000009'
  );

  const createRelation = (
    id: typeof REL_BASIL_TOMATO,
    source: typeof BASIL_ID,
    target: typeof TOMATO_ID,
    type: 'beneficial' | 'detrimental',
    mechanism: PlantRelationMechanism,
    strength: number,
    minDistance: number,
    maxDistance: number | null,
    reason: string
  ) =>
    PlantRelationMother.create({
      id,
      sourcePlantId: source,
      targetPlantId: target,
      type,
      mechanism,
      strength,
      proximity: ProximityDistance.create(minDistance, maxDistance),
      reason,
      user: 'curator-1'
    });

  beforeAll(async () => {
    context = await createDbTestContext({
      plantRelationPersistenceMapper: asValue(plantRelationPersistenceMapper),
      plantRelationRepository: asClass(MongoPlantRelationRepository).singleton()
    });
    db = context.db;

    await up(db);

    repository = context.container.resolve<PlantRelationRepository>(
      'plantRelationRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('findById', () => {
    it('returns the plant relation when present in the collection', async () => {
      const relation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      await repository.save(relation);

      const found = await repository.findById(REL_BASIL_TOMATO);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(REL_BASIL_TOMATO);
      expect(found?.sourcePlantId).toBe(BASIL_ID);
      expect(found?.targetPlantId).toBe(TOMATO_ID);
      expect(found?.type).toBe('beneficial');
      expect(found?.mechanism).toBe('pest_repellent');
      expect(found?.strength).toBe(4);
      expect(found?.proximity.minDistanceCm).toBe(0);
      expect(found?.proximity.maxDistanceCm).toBe(50);
      expect(found?.reason).toBe('Basil protects tomato');
    });

    it('returns null when relation id does not exist', async () => {
      const nonExistentId = '0192e201-0000-7000-8000-000000000999';

      const found = await repository.findById(nonExistentId);

      expect(found).toBeNull();
    });
  });

  describe('findBySourcePlant', () => {
    it('returns all relations originating from the source plant', async () => {
      const basilTomato = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      const basilPepper = createRelation(
        REL_BASIL_PEPPER,
        BASIL_ID,
        PEPPER_ID,
        'beneficial',
        'growth_stimulator',
        3,
        0,
        40,
        'Basil stimulates pepper growth'
      );
      const fennelTomato = createRelation(
        REL_FENNEL_TOMATO,
        FENNEL_ID,
        TOMATO_ID,
        'detrimental',
        'allelopathy',
        4,
        0,
        150,
        'Fennel inhibits tomato'
      );
      await repository.save(basilTomato);
      await repository.save(basilPepper);
      await repository.save(fennelTomato);

      const results = await repository.findBySourcePlant(BASIL_ID);

      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.id);
      expect(ids).toContain(REL_BASIL_TOMATO);
      expect(ids).toContain(REL_BASIL_PEPPER);
    });

    it('returns empty array when source plant has no relations', async () => {
      const results = await repository.findBySourcePlant(UNRELATED_ID);

      expect(results).toEqual([]);
    });
  });

  describe('findByTargetPlant', () => {
    it('returns all relations impacting the target plant', async () => {
      const basilTomato = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      const fennelTomato = createRelation(
        REL_FENNEL_TOMATO,
        FENNEL_ID,
        TOMATO_ID,
        'detrimental',
        'allelopathy',
        4,
        0,
        150,
        'Fennel inhibits tomato'
      );
      await repository.save(basilTomato);
      await repository.save(fennelTomato);

      const results = await repository.findByTargetPlant(TOMATO_ID);

      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.id);
      expect(ids).toContain(REL_BASIL_TOMATO);
      expect(ids).toContain(REL_FENNEL_TOMATO);
    });

    it('returns empty array when target plant has no incoming relations', async () => {
      const results = await repository.findByTargetPlant(UNRELATED_ID);

      expect(results).toEqual([]);
    });
  });

  describe('findBetweenPlants', () => {
    it('returns relations matching the exact source and target direction while excluding reverse relations', async () => {
      const basilTomato = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      const tomatoBasil = createRelation(
        REL_TOMATO_BASIL,
        TOMATO_ID,
        BASIL_ID,
        'beneficial',
        'shade_provider',
        3,
        0,
        50,
        'Tomato shades basil'
      );
      await repository.save(basilTomato);
      await repository.save(tomatoBasil);

      const results = await repository.findBetweenPlants(BASIL_ID, TOMATO_ID);

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe(REL_BASIL_TOMATO);
    });

    it('returns empty array when queried with reversed direction and no reverse edge exists', async () => {
      const basilTomato = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      await repository.save(basilTomato);

      const results = await repository.findBetweenPlants(TOMATO_ID, BASIL_ID);

      expect(results).toEqual([]);
    });

    it('returns empty array when source and target plant are identical', async () => {
      const results = await repository.findBetweenPlants(TOMATO_ID, TOMATO_ID);

      expect(results).toEqual([]);
    });
  });

  describe('findForPlantPair', () => {
    it('returns both directed relations when reciprocal interactions exist between a pair', async () => {
      const cornToBean = createRelation(
        REL_CORN_BEAN,
        CORN_ID,
        BEAN_ID,
        'beneficial',
        'physical_support',
        5,
        0,
        30,
        'Corn supports bean climbing'
      );
      const beanToCorn = createRelation(
        REL_BEAN_CORN,
        BEAN_ID,
        CORN_ID,
        'beneficial',
        'nitrogen_fixer',
        4,
        0,
        40,
        'Bean fixes nitrogen for corn'
      );
      await repository.save(cornToBean);
      await repository.save(beanToCorn);

      const results = await repository.findForPlantPair(CORN_ID, BEAN_ID);

      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.id);
      expect(ids).toContain(REL_CORN_BEAN);
      expect(ids).toContain(REL_BEAN_CORN);
    });

    it.each([
      ['forward order', () => [BASIL_ID, TOMATO_ID] as const],
      ['reverse order', () => [TOMATO_ID, BASIL_ID] as const]
    ])(
      'returns single directed relation when queried in %s',
      async (_description, getPair) => {
        const basilTomato = createRelation(
          REL_BASIL_TOMATO,
          BASIL_ID,
          TOMATO_ID,
          'beneficial',
          'pest_repellent',
          4,
          0,
          50,
          'Basil protects tomato'
        );
        await repository.save(basilTomato);
        const [first, second] = getPair();

        const results = await repository.findForPlantPair(first, second);

        expect(results).toHaveLength(1);
        expect(results[0]?.id).toBe(REL_BASIL_TOMATO);
      }
    );

    it('returns empty array when neither plant has relation with the other', async () => {
      const results = await repository.findForPlantPair(
        UNRELATED_ID,
        TOMATO_ID
      );

      expect(results).toEqual([]);
    });

    it('returns empty array when plantA and plantB are identical', async () => {
      const results = await repository.findForPlantPair(TOMATO_ID, TOMATO_ID);

      expect(results).toEqual([]);
    });
  });

  describe('findForPlantBatch', () => {
    it.each([
      ['empty array', () => []],
      ['single element array', () => [TOMATO_ID]],
      ['duplicate element array', () => [TOMATO_ID, TOMATO_ID]]
    ])(
      'returns empty array when plantIds has fewer than 2 distinct elements (%s)',
      async (_description, getPlantIds) => {
        const results = await repository.findForPlantBatch(getPlantIds());

        expect(results).toEqual([]);
      }
    );

    it('returns all internal relations in a Three Sisters guild batch while excluding external and partially matching relations', async () => {
      const cornToBean = createRelation(
        REL_CORN_BEAN,
        CORN_ID,
        BEAN_ID,
        'beneficial',
        'physical_support',
        5,
        0,
        30,
        'Corn supports bean'
      );
      const beanToCorn = createRelation(
        REL_BEAN_CORN,
        BEAN_ID,
        CORN_ID,
        'beneficial',
        'nitrogen_fixer',
        4,
        0,
        40,
        'Bean fixes nitrogen for corn'
      );
      const squashToCorn = createRelation(
        REL_SQUASH_CORN,
        SQUASH_ID,
        CORN_ID,
        'beneficial',
        'shade_provider',
        4,
        0,
        60,
        'Squash shades corn soil'
      );
      const beanToSquash = createRelation(
        REL_BEAN_SQUASH,
        BEAN_ID,
        SQUASH_ID,
        'beneficial',
        'nitrogen_fixer',
        4,
        0,
        50,
        'Bean fixes nitrogen for squash'
      );
      const cornToTomato = createRelation(
        REL_CORN_TOMATO,
        CORN_ID,
        TOMATO_ID,
        'detrimental',
        'resource_competition',
        3,
        0,
        80,
        'Corn competes with tomato'
      );
      const unrelatedTomato = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );

      await repository.save(cornToBean);
      await repository.save(beanToCorn);
      await repository.save(squashToCorn);
      await repository.save(beanToSquash);
      await repository.save(cornToTomato);
      await repository.save(unrelatedTomato);

      const guild = [CORN_ID, BEAN_ID, SQUASH_ID];
      const results = await repository.findForPlantBatch(guild);

      expect(results).toHaveLength(4);
      const ids = results.map((r) => r.id);
      expect(ids).toContain(REL_CORN_BEAN);
      expect(ids).toContain(REL_BEAN_CORN);
      expect(ids).toContain(REL_SQUASH_CORN);
      expect(ids).toContain(REL_BEAN_SQUASH);
      expect(ids).not.toContain(REL_CORN_TOMATO);
      expect(ids).not.toContain(REL_BASIL_TOMATO);
    });
  });

  describe('save', () => {
    it('persists a new relation document on initial save', async () => {
      const relation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );

      await repository.save(relation);

      const found = await repository.findById(REL_BASIL_TOMATO);
      expect(found).not.toBeNull();
      expect(found?.version).toBe(0);
      expect(found?.strength).toBe(4);
    });

    it('updates an existing relation and increments version on subsequent save', async () => {
      const relation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      await repository.save(relation);

      relation.updateParameters(
        PlantRelationMother.parameters({
          type: 'beneficial',
          mechanism: 'pest_repellent',
          strength: 5,
          proximity: ProximityDistance.create(0, 60),
          reason: 'Updated stronger pest protection'
        }),
        'curator-2'
      );
      await repository.save(relation);

      const updated = await repository.findById(REL_BASIL_TOMATO);
      expect(updated?.version).toBe(1);
      expect(updated?.strength).toBe(5);
      expect(updated?.proximity.maxDistanceCm).toBe(60);
      expect(updated?.reason).toBe('Updated stronger pest protection');
      expect(updated?.metadata.updatedBy).toBe('curator-2');
    });

    it('preserves explicit null maxDistanceCm when updated to unbounded proximity', async () => {
      const relation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Bounded distance'
      );
      await repository.save(relation);

      relation.updateParameters(
        PlantRelationMother.parameters({
          type: 'beneficial',
          mechanism: 'pest_repellent',
          strength: 4,
          proximity: ProximityDistance.create(10, null),
          reason: 'Unbounded distance'
        }),
        'curator-1'
      );
      await repository.save(relation);

      const updated = await repository.findById(REL_BASIL_TOMATO);
      expect(updated?.proximity.isUnbounded()).toBe(true);
      expect(updated?.proximity.maxDistanceCm).toBeNull();
    });

    it('throws DomainConflictException on duplicate compound key collision (source, target, mechanism)', async () => {
      const firstRelation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'First relation'
      );
      const duplicateRelationWithDifferentId = createRelation(
        createPlantRelationId('0192e201-0000-7000-8000-000000000099'),
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        3,
        0,
        40,
        'Duplicate pair and mechanism'
      );
      await repository.save(firstRelation);

      await expect(
        repository.save(duplicateRelationWithDifferentId)
      ).rejects.toThrow(DomainConflictException);
    });
  });

  describe('delete', () => {
    it('physically removes existing document and returns true', async () => {
      const relation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      await repository.save(relation);

      const deleted = await repository.delete(REL_BASIL_TOMATO);

      expect(deleted).toBe(true);
      const found = await repository.findById(REL_BASIL_TOMATO);
      expect(found).toBeNull();
    });

    it('physically removes existing document when expectedVersion matches current version', async () => {
      const relation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      await repository.save(relation);

      const deleted = await repository.delete(
        REL_BASIL_TOMATO,
        relation.version
      );

      expect(deleted).toBe(true);
      const found = await repository.findById(REL_BASIL_TOMATO);
      expect(found).toBeNull();
    });

    it('returns false and preserves document when expectedVersion does not match current version', async () => {
      const relation = createRelation(
        REL_BASIL_TOMATO,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil protects tomato'
      );
      await repository.save(relation);

      const deleted = await repository.delete(
        REL_BASIL_TOMATO,
        relation.version + 1
      );

      expect(deleted).toBe(false);
      const found = await repository.findById(REL_BASIL_TOMATO);
      expect(found).not.toBeNull();
    });

    it('returns false when deleting a non-existent identifier', async () => {
      const nonExistentId = '0192e201-0000-7000-8000-000000000999';

      const deleted = await repository.delete(nonExistentId);

      expect(deleted).toBe(false);
    });
  });
});
