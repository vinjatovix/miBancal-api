import { PlantRelation } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/PlantRelation.js';
import type { PlantRelationPrimitives } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationPrimitives.js';
import { createPlantRelationId } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { PlantRelationMother } from '../mothers/PlantRelationMother.js';

describe('PlantRelation', () => {
  const PLANT_A_ID = createPlantId('0192e200-0000-7000-8000-000000000001');
  const PLANT_B_ID = createPlantId('0192e200-0000-7000-8000-000000000002');
  const RELATION_ID = createPlantRelationId(
    '0192e201-0000-7000-8000-000000000001'
  );

  describe('create factory', () => {
    it('initializes a new PlantRelation with version 0 and audit metadata', () => {
      const proximity = ProximityDistance.create(0, 50);
      const createdAt = new Date('2026-10-28T12:00:00Z');

      const relation = PlantRelation.create({
        id: RELATION_ID,
        sourcePlantId: PLANT_A_ID,
        targetPlantId: PLANT_B_ID,
        type: 'beneficial',
        mechanism: 'pest_repellent',
        strength: 4,
        proximity,
        reason: 'Repels pests',
        user: 'curator-1',
        at: createdAt
      });

      expect(relation.id).toBe(RELATION_ID);
      expect(relation.sourcePlantId).toBe(PLANT_A_ID);
      expect(relation.targetPlantId).toBe(PLANT_B_ID);
      expect(relation.type).toBe('beneficial');
      expect(relation.mechanism).toBe('pest_repellent');
      expect(relation.strength).toBe(4);
      expect(relation.proximity).toBe(proximity);
      expect(relation.reason).toBe('Repels pests');
      expect(relation.version).toBe(0);
      expect(relation.metadata.createdBy).toBe('curator-1');
      expect(relation.metadata.createdAt).toEqual(createdAt);
      expect(relation.metadata.updatedBy).toBe('curator-1');
      expect(relation.metadata.updatedAt).toEqual(createdAt);
    });

    it('generates random relation ID if not supplied in create parameters', () => {
      const relation = PlantRelation.create({
        sourcePlantId: PLANT_A_ID,
        targetPlantId: PLANT_B_ID,
        type: 'beneficial',
        mechanism: 'pollinator_attractor',
        strength: 3,
        proximity: ProximityDistance.create(10, 100),
        reason: 'Attracts bees',
        user: 'system'
      });

      expect(relation.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe('invariants enforcement', () => {
    it('throws InvalidArgumentException when sourcePlantId and targetPlantId are identical', () => {
      expect(() =>
        PlantRelation.create({
          sourcePlantId: PLANT_A_ID,
          targetPlantId: PLANT_A_ID,
          type: 'beneficial',
          mechanism: 'pest_repellent',
          strength: 4,
          proximity: ProximityDistance.create(0, 50),
          reason: 'Self relation',
          user: 'curator'
        })
      ).toThrow(
        '<PlantRelation> source and target participants must be distinct'
      );
    });

    it('throws InvalidArgumentException when id is invalid UUID', () => {
      expect(
        () =>
          new PlantRelation({
            id: 'invalid-uuid' as unknown as typeof RELATION_ID,
            sourcePlantId: PLANT_A_ID,
            targetPlantId: PLANT_B_ID,
            type: 'beneficial',
            mechanism: 'pest_repellent',
            strength: 4,
            proximity: ProximityDistance.create(0, 50),
            reason: 'Valid reason',
            metadata: Metadata.create('user')
          })
      ).toThrow(InvalidArgumentException);
    });

    it.each([
      ['sourcePlantId', { source: 'invalid-uuid', target: PLANT_B_ID }],
      ['targetPlantId', { source: PLANT_A_ID, target: 'invalid-uuid' }]
    ])(
      'throws InvalidArgumentException when %s is invalid UUID',
      (_field, { source, target }) => {
        expect(
          () =>
            new PlantRelation({
              id: RELATION_ID,
              sourcePlantId: source as unknown as typeof PLANT_A_ID,
              targetPlantId: target as unknown as typeof PLANT_B_ID,
              type: 'beneficial',
              mechanism: 'pest_repellent',
              strength: 4,
              proximity: ProximityDistance.create(0, 50),
              reason: 'Valid reason',
              metadata: Metadata.create('user')
            })
        ).toThrow(InvalidArgumentException);
      }
    );

    it('throws InvalidArgumentException when proximity is not an instance of ProximityDistance', () => {
      expect(
        () =>
          new PlantRelation({
            id: RELATION_ID,
            sourcePlantId: PLANT_A_ID,
            targetPlantId: PLANT_B_ID,
            type: 'beneficial',
            mechanism: 'pest_repellent',
            strength: 4,
            proximity: null as unknown as ProximityDistance,
            reason: 'Valid reason',
            metadata: Metadata.create('user')
          })
      ).toThrow(
        '<PlantRelation> proximity must be an instance of ProximityDistance'
      );
    });

    it.each([0, -1, 6, 2.5, NaN])(
      'throws InvalidArgumentException when strength is out of bounds or not an integer (%s)',
      (invalidStrength) => {
        expect(() =>
          PlantRelation.create({
            sourcePlantId: PLANT_A_ID,
            targetPlantId: PLANT_B_ID,
            type: 'beneficial',
            mechanism: 'pest_repellent',
            strength: invalidStrength,
            proximity: ProximityDistance.create(0, 50),
            reason: 'Valid reason',
            user: 'curator'
          })
        ).toThrow(InvalidArgumentException);
      }
    );

    it.each(['', '   ', '\t\n'])(
      'throws InvalidArgumentException when reason is empty or whitespace only',
      (emptyReason) => {
        expect(() =>
          PlantRelation.create({
            sourcePlantId: PLANT_A_ID,
            targetPlantId: PLANT_B_ID,
            type: 'beneficial',
            mechanism: 'pest_repellent',
            strength: 3,
            proximity: ProximityDistance.create(0, 50),
            reason: emptyReason,
            user: 'curator'
          })
        ).toThrow('<PlantRelation> reason must be a non-empty string');
      }
    );

    it('throws InvalidArgumentException when type is unsupported', () => {
      expect(
        () =>
          new PlantRelation({
            id: RELATION_ID,
            sourcePlantId: PLANT_A_ID,
            targetPlantId: PLANT_B_ID,
            type: 'unknown_type' as unknown as 'beneficial',
            mechanism: 'pest_repellent',
            strength: 3,
            proximity: ProximityDistance.create(0, 50),
            reason: 'Valid reason',
            metadata: Metadata.create('user')
          })
      ).toThrow(InvalidArgumentException);
    });

    it('throws InvalidArgumentException when mechanism is unsupported', () => {
      expect(
        () =>
          new PlantRelation({
            id: RELATION_ID,
            sourcePlantId: PLANT_A_ID,
            targetPlantId: PLANT_B_ID,
            type: 'beneficial',
            mechanism: 'unknown_mechanism' as unknown as 'pest_repellent',
            strength: 3,
            proximity: ProximityDistance.create(0, 50),
            reason: 'Valid reason',
            metadata: Metadata.create('user')
          })
      ).toThrow(InvalidArgumentException);
    });

    it('throws InvalidArgumentException when version is negative', () => {
      expect(
        () =>
          new PlantRelation({
            id: RELATION_ID,
            sourcePlantId: PLANT_A_ID,
            targetPlantId: PLANT_B_ID,
            type: 'beneficial',
            mechanism: 'pest_repellent',
            strength: 3,
            proximity: ProximityDistance.create(0, 50),
            reason: 'Valid reason',
            metadata: Metadata.create('user'),
            version: -1
          })
      ).toThrow(InvalidArgumentException);
    });
  });

  describe('updateParameters mutation', () => {
    it('mutates parameters, increments version, and updates audit metadata', () => {
      const relation = PlantRelationMother.beneficial(PLANT_A_ID, PLANT_B_ID, {
        id: RELATION_ID,
        strength: 3,
        reason: 'Original reason',
        user: 'curator-1',
        at: new Date('2026-10-28T10:00:00Z')
      });
      const updatedParams = PlantRelationMother.parameters({
        type: 'detrimental',
        mechanism: 'allelopathy',
        strength: 5,
        proximity: ProximityDistance.create(0, 150),
        reason: '  Updated reason with spaces  '
      });
      const updatedAt = new Date('2026-10-28T14:00:00Z');

      relation.updateParameters(updatedParams, 'curator-2', updatedAt);

      expect(relation.type).toBe('detrimental');
      expect(relation.mechanism).toBe('allelopathy');
      expect(relation.strength).toBe(5);
      expect(relation.proximity.maxDistanceCm).toBe(150);
      expect(relation.reason).toBe('Updated reason with spaces');
      expect(relation.version).toBe(1);
      expect(relation.metadata.createdBy).toBe('curator-1');
      expect(relation.metadata.updatedBy).toBe('curator-2');
      expect(relation.metadata.updatedAt).toEqual(updatedAt);
    });

    it('leaves aggregate version and audit metadata untouched when parameters have not changed', () => {
      const createdAt = new Date('2026-10-28T10:00:00Z');
      const relation = PlantRelationMother.beneficial(PLANT_A_ID, PLANT_B_ID, {
        id: RELATION_ID,
        strength: 3,
        proximity: ProximityDistance.create(0, 50),
        reason: 'Original reason',
        user: 'curator-1',
        at: createdAt
      });
      const sameParams = PlantRelationMother.parameters({
        type: 'beneficial',
        mechanism: 'pest_repellent',
        strength: 3,
        proximity: ProximityDistance.create(0, 50),
        reason: '  Original reason  '
      });

      relation.updateParameters(
        sameParams,
        'curator-2',
        new Date('2026-10-28T14:00:00Z')
      );

      expect(relation.version).toBe(0);
      expect(relation.metadata.createdBy).toBe('curator-1');
      expect(relation.metadata.updatedBy).toBe('curator-1');
      expect(relation.metadata.updatedAt).toEqual(createdAt);
    });
  });

  describe('scoped relations creation and backward compatibility', () => {
    it('creates a genus-to-family scoped relation', () => {
      const source = TaxonomicScope.genus('Tagetes');
      const target = TaxonomicScope.family(
        '0192e200-0000-7000-8000-000000000099'
      );

      const relation = PlantRelationMother.scoped(source, target, {
        mechanism: 'pest_repellent',
        reason: 'Tagetes repels nematodes for Solanaceae family'
      });

      expect(relation.source.scope).toBe('genus');
      expect(relation.source.value).toBe('Tagetes');
      expect(relation.target.scope).toBe('family');
      expect(relation.sourcePlantId).toBeUndefined();
      expect(relation.targetPlantId).toBeUndefined();
    });

    it('creates a universal broadcast relation targeting all', () => {
      const source = TaxonomicScope.plant(PLANT_A_ID);
      const target = TaxonomicScope.all();

      const relation = PlantRelationMother.scoped(source, target, {
        mechanism: 'nitrogen_fixer',
        reason: 'Fixes atmospheric nitrogen for all neighbors'
      });

      expect(relation.source.isPlant()).toBe(true);
      expect(relation.sourcePlantId).toBe(PLANT_A_ID);
      expect(relation.target.isAll()).toBe(true);
      expect(relation.targetPlantId).toBeUndefined();
    });

    it('throws InvalidArgumentException when source scope is all', () => {
      const source = TaxonomicScope.all();
      const target = TaxonomicScope.plant(PLANT_B_ID);

      expect(() => PlantRelationMother.scoped(source, target)).toThrow(
        '<PlantRelation> source scope cannot be broadcast "all"'
      );
    });

    it.each([
      [
        'identical genus scopes',
        TaxonomicScope.genus('Solanum'),
        TaxonomicScope.genus('Solanum')
      ],
      [
        'identical family scopes',
        TaxonomicScope.family('0192e200-0000-7000-8000-000000000001'),
        TaxonomicScope.family('0192e200-0000-7000-8000-000000000001')
      ],
      [
        'case-insensitive genus scopes',
        TaxonomicScope.genus('Solanum'),
        TaxonomicScope.genus('SOLANUM')
      ]
    ])(
      'throws InvalidArgumentException when source and target have %s',
      (_label, source, target) => {
        expect(() => PlantRelationMother.scoped(source, target)).toThrow(
          '<PlantRelation> source and target participants must be distinct'
        );
      }
    );

    it('serializes and reconstitutes scoped relations preserving scopes and projections', () => {
      const source = TaxonomicScope.genus('Allium');
      const target = TaxonomicScope.all();
      const original = PlantRelationMother.scoped(source, target, {
        id: RELATION_ID,
        type: 'beneficial',
        mechanism: 'pest_repellent',
        strength: 3,
        proximity: ProximityDistance.create(0, 100),
        reason: 'Allium volatile compounds deter pests broadly'
      });

      const primitives = original.toPrimitives();
      const reconstituted = PlantRelation.fromPrimitives(primitives);

      expect(reconstituted.source.scope).toBe('genus');
      expect(reconstituted.source.value).toBe('Allium');
      expect(reconstituted.target.scope).toBe('all');
      expect(reconstituted.sourcePlantId).toBeUndefined();
      expect(reconstituted.targetPlantId).toBeUndefined();
    });
  });

  describe('primitives serialization and reconstitution', () => {
    it('serializes to and from primitives preserving exact properties', () => {
      const original = PlantRelationMother.beneficial(PLANT_A_ID, PLANT_B_ID, {
        id: RELATION_ID,
        mechanism: 'nitrogen_fixer',
        strength: 4,
        proximity: ProximityDistance.create(0, 40),
        reason: 'Fixes nitrogen in root nodules',
        user: 'curator-1',
        at: new Date('2026-10-28T12:00:00Z')
      });

      const primitives: PlantRelationPrimitives = original.toPrimitives();
      const reconstituted = PlantRelation.fromPrimitives(primitives);

      expect(reconstituted.toPrimitives()).toEqual(primitives);
    });
  });
});
