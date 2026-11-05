import { Binary } from 'bson';
import { createPlantRelationId } from '../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import { ProximityDistance } from '../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
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
  const FAMILY_ID = '0192e200-0000-7000-8000-000000000099';
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
      expect(document.source?.scope).toBe('plant');
      expect(document.source?.value).toBeInstanceOf(Binary);
      expect(document.target?.scope).toBe('plant');
      expect(document.target?.value).toBeInstanceOf(Binary);
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

    it('converts genus-to-broadcast scoped relation omitting legacy plant IDs', () => {
      const relation = PlantRelationMother.scoped(
        TaxonomicScope.genus('Tagetes'),
        TaxonomicScope.all(),
        {
          id: RELATION_ID,
          mechanism: 'pest_repellent',
          strength: 4,
          proximity: ProximityDistance.create(0, 80),
          reason: 'Repels nematodes broadly',
          user: 'curator-1',
          at: CREATED_AT
        }
      );

      const document = plantRelationPersistenceMapper.toMongoDocument(relation);

      expect(document.source?.scope).toBe('genus');
      expect(document.source?.value).toBe('Tagetes');
      expect(document.target?.scope).toBe('all');
      expect(document.target?.value).toBeUndefined();
      expect(document.sourcePlantId).toBeUndefined();
      expect(document.targetPlantId).toBeUndefined();
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
    it('reconstitutes PlantRelation from document with modern scoped fields', () => {
      const document: MongoPlantRelationDocument = {
        _id: toMongoId(RELATION_ID),
        source: { scope: 'genus', value: 'Allium' },
        target: { scope: 'family', value: toMongoId(FAMILY_ID) },
        type: 'beneficial',
        mechanism: 'pest_repellent',
        strength: 4,
        minDistanceCm: 0,
        maxDistanceCm: 100,
        reason: 'Deters pests across family',
        metadata: {
          createdAt: CREATED_AT,
          createdBy: 'curator-1',
          updatedAt: CREATED_AT,
          updatedBy: 'curator-1'
        },
        version: 1
      };

      const relation =
        plantRelationPersistenceMapper.fromMongoDocument(document);

      expect(relation.id).toBe(RELATION_ID);
      expect(relation.source.scope).toBe('genus');
      expect(relation.source.value).toBe('Allium');
      expect(relation.target.scope).toBe('family');
      expect(relation.target.value).toBe(FAMILY_ID);
      expect(relation.sourcePlantId).toBeUndefined();
      expect(relation.targetPlantId).toBeUndefined();
      expect(relation.version).toBe(1);
    });

    it('reconstitutes PlantRelation from legacy document missing source and target objects', () => {
      const document: MongoPlantRelationDocument = {
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
      };

      const relation =
        plantRelationPersistenceMapper.fromMongoDocument(document);

      expect(relation.id).toBe(RELATION_ID);
      expect(relation.source.scope).toBe('plant');
      expect(relation.source.value).toBe(PLANT_A_ID);
      expect(relation.target.scope).toBe('plant');
      expect(relation.target.value).toBe(PLANT_B_ID);
      expect(relation.sourcePlantId).toBe(PLANT_A_ID);
      expect(relation.targetPlantId).toBe(PLANT_B_ID);
      expect(relation.type).toBe('detrimental');
      expect(relation.version).toBe(2);
    });

    it('reconstitutes PlantRelation from document with string identifiers and null maxDistanceCm', () => {
      const document: MongoPlantRelationDocument = {
        _id: RELATION_ID,
        source: { scope: 'plant', value: PLANT_A_ID },
        target: { scope: 'plant', value: PLANT_B_ID },
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
      };

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
    it('preserves exact aggregate state through round-trip serialization and deserialization for species relations', () => {
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

    it('preserves exact aggregate state through round-trip serialization and deserialization for broadcast relations', () => {
      const original = PlantRelationMother.scoped(
        TaxonomicScope.genus('Trifolium'),
        TaxonomicScope.all(),
        {
          id: RELATION_ID,
          type: 'beneficial',
          mechanism: 'nitrogen_fixer',
          strength: 5,
          proximity: ProximityDistance.create(0, 100),
          reason: 'Fixes atmospheric nitrogen for all neighbors within 100cm',
          user: 'curator-1',
          at: CREATED_AT
        }
      );

      const document = plantRelationPersistenceMapper.toMongoDocument(original);
      const reconstituted =
        plantRelationPersistenceMapper.fromMongoDocument(document);

      expect(reconstituted.toPrimitives()).toEqual(original.toPrimitives());
    });
  });
});
