import { asClass, asValue } from 'awilix';
import type { Db } from 'mongodb';
import { up } from '../../../../../../migrations/scripts/20261028120000-create-plant-relations-collection.js';
import type { PlantRelationReadRepository } from '../../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import type { PlantRelationMechanism } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationMechanism.js';
import { createPlantRelationId } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import type { PlantRelationRepository } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/repositories/interfaces/PlantRelationRepository.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { PlantRelationQueryMapper } from '../../../../../../src/Contexts/Agro/PlantRelations/infrastructure/persistence/mappers/PlantRelationQueryMapper.js';
import { MongoPlantRelationReadRepository } from '../../../../../../src/Contexts/Agro/PlantRelations/infrastructure/persistence/MongoPlantRelationReadRepository.js';
import { MongoPlantRelationRepository } from '../../../../../../src/Contexts/Agro/PlantRelations/infrastructure/persistence/MongoPlantRelationRepository.js';
import { plantRelationPersistenceMapper } from '../../../../../../src/Contexts/Agro/PlantRelations/mappers/plantRelationPersistenceMapper.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { PlantRelationMother } from '../../domain/mothers/PlantRelationMother.js';

describe('MongoPlantRelationReadRepository (db)', () => {
  let context: DbTestContext;
  let db: Db;
  let writeRepository: PlantRelationRepository;
  let readRepository: PlantRelationReadRepository;

  const TOMATO_ID = createPlantId('0192e200-0000-7000-8000-000000000001');
  const BASIL_ID = createPlantId('0192e200-0000-7000-8000-000000000002');
  const PEPPER_ID = createPlantId('0192e200-0000-7000-8000-000000000003');

  const REL_1 = createPlantRelationId('0192e201-0000-7000-8000-000000000001');
  const REL_2 = createPlantRelationId('0192e201-0000-7000-8000-000000000002');
  const REL_3 = createPlantRelationId('0192e201-0000-7000-8000-000000000003');

  const createRelation = (
    id: typeof REL_1,
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
      plantRelationQueryMapper: asClass(PlantRelationQueryMapper).singleton(),
      plantRelationRepository: asClass(
        MongoPlantRelationRepository
      ).singleton(),
      plantRelationReadRepository: asClass(
        MongoPlantRelationReadRepository
      ).singleton()
    });
    db = context.db;

    await up(db);

    writeRepository = context.container.resolve<PlantRelationRepository>(
      'plantRelationRepository'
    );
    readRepository = context.container.resolve<PlantRelationReadRepository>(
      'plantRelationReadRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('findById', () => {
    it('should return null when relation does not exist', async () => {
      const result = await readRepository.findById(
        '0192e201-0000-7000-8000-000000000999'
      );

      expect(result).toBeNull();
    });

    it('should find relation and map document to PlantRelationReadView correctly', async () => {
      const relation = createRelation(
        REL_1,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil repels pests that attack tomato.'
      );
      await writeRepository.save(relation);

      const result = await readRepository.findById(REL_1);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: REL_1,
        sourcePlantId: BASIL_ID,
        targetPlantId: TOMATO_ID,
        type: 'beneficial',
        mechanism: 'pest_repellent',
        strength: 4,
        proximity: {
          minDistanceCm: 0,
          maxDistanceCm: 50
        },
        reason: 'Basil repels pests that attack tomato.',
        metadata: {
          createdAt: expect.any(Date) as unknown,
          createdBy: 'curator-1',
          updatedAt: expect.any(Date) as unknown,
          updatedBy: 'curator-1'
        },
        version: 0
      });
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      const rel1 = createRelation(
        REL_1,
        BASIL_ID,
        TOMATO_ID,
        'beneficial',
        'pest_repellent',
        4,
        0,
        50,
        'Basil repels pests.'
      );
      const rel2 = createRelation(
        REL_2,
        TOMATO_ID,
        PEPPER_ID,
        'detrimental',
        'disease_vector',
        2,
        10,
        null,
        'Shared blight risk.'
      );
      const rel3 = createRelation(
        REL_3,
        PEPPER_ID,
        BASIL_ID,
        'beneficial',
        'growth_stimulator',
        5,
        0,
        30,
        'Pepper benefits from basil.'
      );

      await writeRepository.save(rel1);
      await writeRepository.save(rel2);
      await writeRepository.save(rel3);
    });

    it('should return all relations paginated with default sort', async () => {
      const result = await readRepository.findAll();

      expect(result.pagination.totalItems).toBe(3);
      expect(result.data).toHaveLength(3);
    });

    it('should filter by sourcePlantId', async () => {
      const result = await readRepository.findAll({
        filter: { sourcePlantId: { eq: BASIL_ID } }
      });

      expect(result.pagination.totalItems).toBe(1);
      expect(result.data[0]?.id).toBe(REL_1);
    });

    it('should filter by targetPlantId', async () => {
      const result = await readRepository.findAll({
        filter: { targetPlantId: { eq: PEPPER_ID } }
      });

      expect(result.pagination.totalItems).toBe(1);
      expect(result.data[0]?.id).toBe(REL_2);
    });

    it('should filter by unified plantId when plant is source or target', async () => {
      const result = await readRepository.findAll({
        filter: { plantId: { eq: TOMATO_ID } }
      });

      expect(result.pagination.totalItems).toBe(2);
      const ids = result.data.map((r) => r.id);
      expect(ids).toContain(REL_1);
      expect(ids).toContain(REL_2);
    });

    it('should filter by type', async () => {
      const result = await readRepository.findAll({
        filter: { type: { eq: 'detrimental' } }
      });

      expect(result.pagination.totalItems).toBe(1);
      expect(result.data[0]?.id).toBe(REL_2);
    });

    it('should filter by mechanism', async () => {
      const result = await readRepository.findAll({
        filter: { mechanism: { eq: 'growth_stimulator' } }
      });

      expect(result.pagination.totalItems).toBe(1);
      expect(result.data[0]?.id).toBe(REL_3);
    });

    it('should respect custom sort', async () => {
      const result = await readRepository.findAll({
        sort: { strength: 'asc' }
      });

      expect(result.data.map((r) => r.strength)).toEqual([2, 4, 5]);
    });

    it('should respect pagination limits', async () => {
      const result = await readRepository.findAll({
        pagination: { page: 1, limit: 2 }
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.totalItems).toBe(3);
    });
  });
});
