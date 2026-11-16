import { createPlantRelationId } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import { CompanionEvaluationService } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/CompanionEvaluationService.js';
import type {
  CropPlacement,
  TaxonomicTier
} from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/types/CompanionEvaluationTypes.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
import { PlantRelationMother } from '../mothers/PlantRelationMother.js';

describe('CompanionEvaluationService', () => {
  const TOMATO_PLANT_ID = '0192e200-0000-7000-8000-000000000001';
  const BASIL_PLANT_ID = '0192e200-0000-7000-8000-000000000002';
  const FENNEL_PLANT_ID = '0192e200-0000-7000-8000-000000000004';
  const CLOVER_PLANT_ID = '0192e200-0000-7000-8000-000000000005';
  const BEAN_PLANT_ID = '0192e200-0000-7000-8000-000000000006';

  const FAMILY_SOLANACEAE = '0192e200-0000-7000-8000-000000000010';
  const FAMILY_LAMIACEAE = '0192e200-0000-7000-8000-000000000020';
  const FAMILY_APIACEAE = '0192e200-0000-7000-8000-000000000030';
  const FAMILY_FABACEAE = '0192e200-0000-7000-8000-000000000040';

  const tomatoCrop: CropPlacement = {
    id: 'crop-tomato-1',
    plantId: TOMATO_PLANT_ID,
    scientificName: 'Solanum lycopersicum',
    familyId: FAMILY_SOLANACEAE,
    position: { x: 0, y: 0 }
  };

  const basilCrop: CropPlacement = {
    id: 'crop-basil-1',
    plantId: BASIL_PLANT_ID,
    scientificName: 'Ocimum basilicum',
    familyId: FAMILY_LAMIACEAE,
    position: { x: 30, y: 0 }
  };

  const fennelCrop: CropPlacement = {
    id: 'crop-fennel-1',
    plantId: FENNEL_PLANT_ID,
    scientificName: 'Foeniculum vulgare',
    familyId: FAMILY_APIACEAE,
    position: { x: 25, y: 0 }
  };

  const cloverCrop: CropPlacement = {
    id: 'crop-clover-1',
    plantId: CLOVER_PLANT_ID,
    scientificName: 'Trifolium repens',
    familyId: FAMILY_FABACEAE,
    position: { x: 50, y: 0 }
  };

  const cloverCloneCrop: CropPlacement = {
    id: 'crop-clover-2',
    plantId: CLOVER_PLANT_ID,
    scientificName: 'Trifolium repens',
    familyId: FAMILY_FABACEAE,
    position: { x: 0, y: 0 }
  };

  const beanCrop: CropPlacement = {
    id: 'crop-bean-1',
    plantId: BEAN_PLANT_ID,
    scientificName: 'Phaseolus vulgaris',
    familyId: FAMILY_FABACEAE,
    position: { x: 60, y: 0 }
  };

  const service = new CompanionEvaluationService();

  describe('4-tier specificity scoring table', () => {
    type SpecificityTestCase = {
      sourceScope: TaxonomicScope;
      targetScope: TaxonomicScope;
      cropA: CropPlacement;
      cropB: CropPlacement;
      expectedScore: number;
      expectedTier: TaxonomicTier;
    };

    const cases: [string, SpecificityTestCase][] = [
      [
        'Tier 1 (Species -> Species = 100)',
        {
          sourceScope: TaxonomicScope.plant(BASIL_PLANT_ID),
          targetScope: TaxonomicScope.plant(TOMATO_PLANT_ID),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 100,
          expectedTier: 'species'
        }
      ],
      [
        'Tier 2 (Species -> Genus = 80)',
        {
          sourceScope: TaxonomicScope.plant(BASIL_PLANT_ID),
          targetScope: TaxonomicScope.genus('Solanum'),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 80,
          expectedTier: 'genus'
        }
      ],
      [
        'Tier 2 (Genus -> Species = 80)',
        {
          sourceScope: TaxonomicScope.genus('Ocimum'),
          targetScope: TaxonomicScope.plant(TOMATO_PLANT_ID),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 80,
          expectedTier: 'genus'
        }
      ],
      [
        'Tier 2 (Genus -> Genus = 70)',
        {
          sourceScope: TaxonomicScope.genus('Ocimum'),
          targetScope: TaxonomicScope.genus('Solanum'),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 70,
          expectedTier: 'genus'
        }
      ],
      [
        'Tier 3 (Species -> Family = 60)',
        {
          sourceScope: TaxonomicScope.plant(BASIL_PLANT_ID),
          targetScope: TaxonomicScope.family(FAMILY_SOLANACEAE),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 60,
          expectedTier: 'family'
        }
      ],
      [
        'Tier 3 (Family -> Species = 60)',
        {
          sourceScope: TaxonomicScope.family(FAMILY_LAMIACEAE),
          targetScope: TaxonomicScope.plant(TOMATO_PLANT_ID),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 60,
          expectedTier: 'family'
        }
      ],
      [
        'Tier 3 (Genus -> Family = 50)',
        {
          sourceScope: TaxonomicScope.genus('Ocimum'),
          targetScope: TaxonomicScope.family(FAMILY_SOLANACEAE),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 50,
          expectedTier: 'family'
        }
      ],
      [
        'Tier 3 (Family -> Genus = 50)',
        {
          sourceScope: TaxonomicScope.family(FAMILY_LAMIACEAE),
          targetScope: TaxonomicScope.genus('Solanum'),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 50,
          expectedTier: 'family'
        }
      ],
      [
        'Tier 3 (Family -> Family = 40)',
        {
          sourceScope: TaxonomicScope.family(FAMILY_LAMIACEAE),
          targetScope: TaxonomicScope.family(FAMILY_SOLANACEAE),
          cropA: basilCrop,
          cropB: tomatoCrop,
          expectedScore: 40,
          expectedTier: 'family'
        }
      ],
      [
        'Tier 4 (Species -> All = 30)',
        {
          sourceScope: TaxonomicScope.plant(CLOVER_PLANT_ID),
          targetScope: TaxonomicScope.all(),
          cropA: cloverCrop,
          cropB: tomatoCrop,
          expectedScore: 30,
          expectedTier: 'broadcast'
        }
      ],
      [
        'Tier 4 (Genus -> All = 20)',
        {
          sourceScope: TaxonomicScope.genus('Trifolium'),
          targetScope: TaxonomicScope.all(),
          cropA: cloverCrop,
          cropB: tomatoCrop,
          expectedScore: 20,
          expectedTier: 'broadcast'
        }
      ],
      [
        'Tier 4 (Family -> All = 10)',
        {
          sourceScope: TaxonomicScope.family(FAMILY_FABACEAE),
          targetScope: TaxonomicScope.all(),
          cropA: cloverCrop,
          cropB: tomatoCrop,
          expectedScore: 10,
          expectedTier: 'broadcast'
        }
      ]
    ];

    it.each(cases)(
      'evaluates %s correctly',
      (
        _label,
        { sourceScope, targetScope, cropA, cropB, expectedScore, expectedTier }
      ) => {
        const rule = PlantRelationMother.scoped(sourceScope, targetScope, {
          mechanism: 'pest_repellent',
          proximity: ProximityDistance.create(0, 100),
          reason: 'Test rule'
        });

        const result = service.evaluatePair(cropA, cropB, [rule]);

        expect(result.activeRelations).toHaveLength(1);
        expect(result.activeRelations[0]?.specificityScore).toBe(expectedScore);
        expect(result.activeRelations[0]?.tier).toBe(expectedTier);
      }
    );
  });

  describe('strict per-mechanism shadowing', () => {
    it('shadows broad family synergy with specific species antagonism for the same mechanism', () => {
      const familySynergy = PlantRelationMother.scoped(
        TaxonomicScope.family(FAMILY_APIACEAE),
        TaxonomicScope.family(FAMILY_SOLANACEAE),
        {
          id: createPlantRelationId('0192e201-0000-7000-8000-000000000010'),
          type: 'beneficial',
          mechanism: 'allelopathy',
          strength: 2,
          proximity: ProximityDistance.create(0, 100),
          reason: 'General family synergy'
        }
      );
      const fennelAntagonism = PlantRelationMother.scoped(
        TaxonomicScope.plant(FENNEL_PLANT_ID),
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        {
          id: createPlantRelationId('0192e201-0000-7000-8000-000000000011'),
          type: 'detrimental',
          mechanism: 'allelopathy',
          strength: 5,
          proximity: ProximityDistance.create(0, 100),
          reason: 'Fennel root exudates inhibit tomato'
        }
      );

      const result = service.evaluatePair(fennelCrop, tomatoCrop, [
        familySynergy,
        fennelAntagonism
      ]);

      expect(result.activeRelations).toHaveLength(1);
      expect(result.activeRelations[0]?.relationId).toBe(fennelAntagonism.id);
      expect(result.activeRelations[0]?.type).toBe('detrimental');
      expect(result.activeRelations[0]?.strength).toBe(5);
      expect(result.activeRelations[0]?.tier).toBe('species');
      expect(result.shadowedRulesCount).toBe(1);
    });

    it('allows multiple rules to co-exist across different biological mechanisms', () => {
      const speciesSupport = PlantRelationMother.scoped(
        TaxonomicScope.plant(CLOVER_PLANT_ID),
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        {
          id: createPlantRelationId('0192e201-0000-7000-8000-000000000020'),
          type: 'beneficial',
          mechanism: 'physical_support',
          strength: 3,
          proximity: ProximityDistance.create(0, 100),
          reason: 'Living mulch support'
        }
      );
      const broadcastNitrogen = PlantRelationMother.scoped(
        TaxonomicScope.genus('Trifolium'),
        TaxonomicScope.all(),
        {
          id: createPlantRelationId('0192e201-0000-7000-8000-000000000021'),
          type: 'beneficial',
          mechanism: 'nitrogen_fixer',
          strength: 4,
          proximity: ProximityDistance.create(0, 100),
          reason: 'Fixes atmospheric nitrogen'
        }
      );

      const result = service.evaluatePair(cloverCrop, tomatoCrop, [
        speciesSupport,
        broadcastNitrogen
      ]);

      expect(result.activeRelations).toHaveLength(2);
      expect(result.shadowedRulesCount).toBe(0);
      const mechanisms = result.activeRelations.map((r) => r.mechanism);
      expect(mechanisms).toContain('physical_support');
      expect(mechanisms).toContain('nitrogen_fixer');
    });

    it('breaks ties deterministically by lowest relationId when specificity scores match', () => {
      const ruleA = PlantRelationMother.scoped(
        TaxonomicScope.genus('Ocimum'),
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        {
          id: createPlantRelationId('0192e201-0000-7000-8000-000000000001'),
          mechanism: 'pest_repellent',
          strength: 4,
          proximity: ProximityDistance.create(0, 100),
          reason: 'Rule A'
        }
      );
      const ruleB = PlantRelationMother.scoped(
        TaxonomicScope.plant(BASIL_PLANT_ID),
        TaxonomicScope.genus('Solanum'),
        {
          id: createPlantRelationId('0192e201-0000-7000-8000-000000000002'),
          mechanism: 'pest_repellent',
          strength: 5,
          proximity: ProximityDistance.create(0, 100),
          reason: 'Rule B'
        }
      );

      const result = service.evaluatePair(basilCrop, tomatoCrop, [
        ruleB,
        ruleA
      ]);

      expect(result.activeRelations).toHaveLength(1);
      expect(result.activeRelations[0]?.relationId).toBe(ruleA.id);
      expect(result.shadowedRulesCount).toBe(1);
    });
  });

  describe('spatial proximity filtering', () => {
    it('applies rule when distance is within bounds', () => {
      const rule = PlantRelationMother.scoped(
        TaxonomicScope.plant(BASIL_PLANT_ID),
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        {
          mechanism: 'pest_repellent',
          proximity: ProximityDistance.create(0, 50),
          reason: 'Within 50cm'
        }
      );

      const result = service.evaluatePair(basilCrop, tomatoCrop, [rule]);

      expect(result.distanceCm).toBe(30);
      expect(result.activeRelations).toHaveLength(1);
    });

    it('excludes rule when distance exceeds maxDistanceCm', () => {
      const rule = PlantRelationMother.scoped(
        TaxonomicScope.plant(BASIL_PLANT_ID),
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        {
          mechanism: 'pest_repellent',
          proximity: ProximityDistance.create(0, 20),
          reason: 'Within 20cm only'
        }
      );

      const result = service.evaluatePair(basilCrop, tomatoCrop, [rule]);

      expect(result.distanceCm).toBe(30);
      expect(result.activeRelations).toHaveLength(0);
    });

    it('applies rule when distance is unbounded (maxDistanceCm is null)', () => {
      const rule = PlantRelationMother.scoped(
        TaxonomicScope.plant(BASIL_PLANT_ID),
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        {
          mechanism: 'pollinator_attractor',
          proximity: ProximityDistance.create(0, null),
          reason: 'Whole bed'
        }
      );

      const result = service.evaluatePair(basilCrop, tomatoCrop, [rule]);

      expect(result.activeRelations).toHaveLength(1);
    });
  });

  describe('self and monoculture exclusions', () => {
    it('returns empty active relations when crop placement evaluates against itself', () => {
      const broadcastRule = PlantRelationMother.scoped(
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        TaxonomicScope.all(),
        {
          mechanism: 'pollinator_attractor',
          proximity: ProximityDistance.create(0, 100),
          reason: 'Attracts bees'
        }
      );

      const result = service.evaluatePair(tomatoCrop, tomatoCrop, [
        broadcastRule
      ]);

      expect(result.activeRelations).toHaveLength(0);
      expect(result.shadowedRulesCount).toBe(0);
    });

    it('excludes broadcast interaction when evaluated between two instances of identical species at distance 0', () => {
      const broadcastRule = PlantRelationMother.scoped(
        TaxonomicScope.genus('Trifolium'),
        TaxonomicScope.all(),
        {
          mechanism: 'nitrogen_fixer',
          proximity: ProximityDistance.create(0, 100),
          reason: 'Broadcast nitrogen'
        }
      );

      const result = service.evaluatePair(cloverCrop, cloverCloneCrop, [
        broadcastRule
      ]);

      expect(result.activeRelations).toHaveLength(0);
    });
  });

  describe('edge cases and graceful degradation', () => {
    it('degrades gracefully when scientificName is blank, bypassing genus tier without throwing', () => {
      const blankScientificCrop: CropPlacement = {
        id: 'crop-blank-1',
        plantId: '0192e200-0000-7000-8000-000000000099',
        scientificName: '   ',
        familyId: FAMILY_SOLANACEAE,
        position: { x: 20, y: 0 }
      };
      const genusRule = PlantRelationMother.scoped(
        TaxonomicScope.genus('Ocimum'),
        TaxonomicScope.genus('Solanum'),
        {
          mechanism: 'pest_repellent',
          proximity: ProximityDistance.create(0, 50),
          reason: 'Genus rule'
        }
      );

      const result = service.evaluatePair(basilCrop, blankScientificCrop, [
        genusRule
      ]);

      expect(result.activeRelations).toHaveLength(0);
    });

    it('degrades gracefully when familyId is undefined, bypassing family tier without throwing', () => {
      const noFamilyCrop: CropPlacement = {
        id: 'crop-no-family-1',
        plantId: '0192e200-0000-7000-8000-000000000099',
        scientificName: 'Solanum lycopersicum',
        position: { x: 20, y: 0 }
      };
      const familyRule = PlantRelationMother.scoped(
        TaxonomicScope.family(FAMILY_LAMIACEAE),
        TaxonomicScope.family(FAMILY_SOLANACEAE),
        {
          mechanism: 'pest_repellent',
          proximity: ProximityDistance.create(0, 50),
          reason: 'Family rule'
        }
      );

      const result = service.evaluatePair(basilCrop, noFamilyCrop, [
        familyRule
      ]);

      expect(result.activeRelations).toHaveLength(0);
    });
  });

  describe('evaluateBed', () => {
    it('evaluates all directional pairs in a bed and returns only non-empty interactions', () => {
      const speciesRule = PlantRelationMother.scoped(
        TaxonomicScope.plant(BASIL_PLANT_ID),
        TaxonomicScope.plant(TOMATO_PLANT_ID),
        {
          mechanism: 'pest_repellent',
          proximity: ProximityDistance.create(0, 50),
          reason: 'Basil protects tomato'
        }
      );

      const results = service.evaluateBed(
        [basilCrop, tomatoCrop, beanCrop],
        [speciesRule]
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.influencerCropId).toBe(basilCrop.id);
      expect(results[0]?.affectedCropId).toBe(tomatoCrop.id);
      expect(results[0]?.activeRelations).toHaveLength(1);
    });
  });
});
