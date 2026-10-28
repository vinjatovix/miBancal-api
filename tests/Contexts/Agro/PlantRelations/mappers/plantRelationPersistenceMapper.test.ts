import { Binary } from 'bson';
import { createPlantRelationId } from '../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import { ProximityDistance } from '../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import type { MongoPlantRelationDocument } from '../../../../../src/Contexts/Agro/PlantRelations/infrastructure/persistence/types/MongoPlantRelationDocument.js';
import { plantRelationPersistenceMapper } from '../../../../../src/Contexts/Agro/PlantRelations/mappers/plantRelationPersistenceMapper.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { PlantRelationMother } from '../domain/mothers/PlantRelationMother.js';

describe('plantRelationPersistenceMapper', () => {
  const RELATION_ID = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000001'
  );
  const PLANT_A_ID = createPlantId('0192e200-0000-7000-8000-000000000001');
  const PLANT_B_ID = createPlantId('0192e200-0000-7000-8000-000000000002');
  const CREATED_AT = new Date('2026-10-28T12:00:00Z');

  describe('toMongoDocument', () => {
    it('converts domain entity to MongoDB document with BSON Binary UUIDs and bounded distance', () => {
      const relation = PlantRelationMother.beneficial(PLANT_A_ID, PLANT_B_ID, {
        id: RELATION_ID,
        strength: 4,
        proximity: ProximityDistance.create(0, 50),
        reason: 'Repels pests',
        user: 'curator-1',
        at: CREATED_AT
      });

      const document = plantRelationPersistenceMapper.toMongoDocument(relation);

      expect(document._id).toBeInstanceOf(Binary);
      expect(document.sourcePlantId).toBeInstanceOf(Binary);
      expect(document.targetPlantId).toBeInstanceOf(Binary);
      expect(document.type).toBe('beneficial');
      expect(document.mechanism).toBe('pest_repellent');
      expect(document.strength).toBe(4);
      expect(document.minDistanceCm).toBe(0);
      expect(document.maxDistanceCm).toBe(50);
      expect(document.reason).toBe('Repels pests');
      expect(document.version).toBe(0);
      expect(document.metadata.createdBy).toBe('curator-1');
      expect(document.metadata.createdAt).toEqual(CREATED_AT);
    });

    it('converts domain entity with unbounded distance (null maxDistanceCm)', () => {
      const relation = PlantRelationMother.beneficial(PLANT_A_ID, PLANT_B_ID, {
        id: RELATION_ID,
        mechanism: 'pollinator_attractor',
        strength: 5,
        proximity: ProximityDistance.create(10, null),
        reason: 'Attracts pollinators everywhere',
        user: 'curator-1',
        at: CREATED_AT
      });

      const document = plantRelationPersistenceMapper.toMongoDocument(relation);

      expect(document.minDistanceCm).toBe(10);
      expect(document.maxDistanceCm).toBeNull();
    });
  });

  describe('fromMongoDocument', () => {
    it('reconstitutes PlantRelation from document with BSON Binary identifiers', () => {
      const document: MongoPlantRelationDocument =
        PlantRelationMother.mongoDocument({
          _id: toMongoId(RELATION_ID),
          sourcePlantId: toMongoId(PLANT_A_ID),
          targetPlantId: toMongoId(PLANT_B_ID),
          type: 'detrimental',
          mechanism: 'allelopathy',
          strength: 5,
          minDistanceCm: 0,
          maxDistanceCm: 150,
          reason: 'Inhibits growth via juglone',
          metadata: {
            createdAt: CREATED_AT,
            createdBy: 'curator-1',
            updatedAt: CREATED_AT,
            updatedBy: 'curator-1'
          },
          version: 2
        });

      const relation =
        plantRelationPersistenceMapper.fromMongoDocument(document);

      expect(relation.id).toBe(RELATION_ID);
      expect(relation.sourcePlantId).toBe(PLANT_A_ID);
      expect(relation.targetPlantId).toBe(PLANT_B_ID);
      expect(relation.type).toBe('detrimental');
      expect(relation.mechanism).toBe('allelopathy');
      expect(relation.strength).toBe(5);
      expect(relation.proximity.minDistanceCm).toBe(0);
      expect(relation.proximity.maxDistanceCm).toBe(150);
      expect(relation.reason).toBe('Inhibits growth via juglone');
      expect(relation.version).toBe(2);
      expect(relation.metadata.createdBy).toBe('curator-1');
      expect(relation.metadata.createdAt).toEqual(CREATED_AT);
      expect(relation.metadata.updatedBy).toBe('curator-1');
      expect(relation.metadata.updatedAt).toEqual(CREATED_AT);
    });

    it('reconstitutes PlantRelation from document with string identifiers and null maxDistanceCm', () => {
      const document: MongoPlantRelationDocument =
        PlantRelationMother.mongoDocument({
          _id: RELATION_ID,
          sourcePlantId: PLANT_A_ID,
          targetPlantId: PLANT_B_ID,
          type: 'beneficial',
          mechanism: 'shade_provider',
          strength: 3,
          minDistanceCm: 0,
          maxDistanceCm: null,
          reason: 'Provides shade',
          metadata: {
            createdAt: CREATED_AT,
            createdBy: 'system',
            updatedAt: CREATED_AT,
            updatedBy: 'system'
          },
          version: 0
        });

      const relation =
        plantRelationPersistenceMapper.fromMongoDocument(document);

      expect(relation.id).toBe(RELATION_ID);
      expect(relation.sourcePlantId).toBe(PLANT_A_ID);
      expect(relation.targetPlantId).toBe(PLANT_B_ID);
      expect(relation.proximity.isUnbounded()).toBe(true);
      expect(relation.proximity.maxDistanceCm).toBeNull();
    });
  });

  describe('round-trip fidelity', () => {
    it('preserves exact aggregate state through round-trip serialization and deserialization', () => {
      const original = PlantRelationMother.beneficial(PLANT_A_ID, PLANT_B_ID, {
        id: RELATION_ID,
        mechanism: 'physical_support',
        strength: 4,
        proximity: ProximityDistance.create(5, 30),
        reason: 'Trellis support',
        user: 'curator-1',
        at: CREATED_AT
      });

      const document = plantRelationPersistenceMapper.toMongoDocument(original);
      const reconstituted =
        plantRelationPersistenceMapper.fromMongoDocument(document);

      expect(reconstituted.toPrimitives()).toEqual(original.toPrimitives());
    });
  });
});
