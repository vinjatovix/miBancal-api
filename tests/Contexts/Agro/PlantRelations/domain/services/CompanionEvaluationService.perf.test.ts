import { performance } from 'node:perf_hooks';
import { CompanionEvaluationService } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/CompanionEvaluationService.js';
import type { CropPlacement } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/types/CompanionEvaluationTypes.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
import { PlantRelationMother } from '../mothers/PlantRelationMother.js';

describe('CompanionEvaluationService performance benchmark', () => {
  it('evaluates compatibility for 50 placed crops in under 20ms (SC-005)', () => {
    const service = new CompanionEvaluationService();

    const genera = ['Solanum', 'Ocimum', 'Tagetes', 'Trifolium', 'Phaseolus'];
    const FAMILY_A = '0192e200-0000-7000-8000-000000000001';
    const FAMILY_B = '0192e200-0000-7000-8000-000000000002';
    const families = [
      FAMILY_A,
      FAMILY_B,
      '0192e200-0000-7000-8000-000000000003',
      '0192e200-0000-7000-8000-000000000004'
    ];
    const plantIdAt = (i: number): string =>
      `0192e200-0000-7000-8000-0000000000${(i % 10).toString().padStart(2, '0')}`;

    const crops: CropPlacement[] = Array.from({ length: 50 }, (_, i) => {
      const genus = genera[i % genera.length];
      const familyId = families[i % families.length];
      return {
        id: `crop-${i}`,
        plantId: plantIdAt(i),
        scientificName: `${genus} species_${i}`,
        ...(familyId !== undefined ? { familyId } : {}),
        position: {
          x: (i % 10) * 30,
          y: Math.floor(i / 10) * 30
        }
      };
    });

    const candidateRules = [
      PlantRelationMother.scoped(
        TaxonomicScope.genus('Tagetes'),
        TaxonomicScope.family(FAMILY_A),
        {
          mechanism: 'pest_repellent',
          proximity: ProximityDistance.create(0, 100),
          reason: 'Repellent'
        }
      ),
      PlantRelationMother.scoped(
        TaxonomicScope.genus('Trifolium'),
        TaxonomicScope.all(),
        {
          mechanism: 'nitrogen_fixer',
          proximity: ProximityDistance.create(0, 80),
          reason: 'Nitrogen'
        }
      ),
      PlantRelationMother.scoped(
        TaxonomicScope.family(FAMILY_B),
        TaxonomicScope.family(FAMILY_A),
        {
          mechanism: 'growth_stimulator',
          proximity: ProximityDistance.create(0, 50),
          reason: 'Stimulator'
        }
      ),
      PlantRelationMother.scoped(
        TaxonomicScope.plant(plantIdAt(0)),
        TaxonomicScope.plant(plantIdAt(1)),
        {
          mechanism: 'physical_support',
          proximity: ProximityDistance.create(0, 60),
          reason: 'Support'
        }
      )
    ];

    // Warm-up JIT
    for (let w = 0; w < 5; w++) {
      service.evaluateBed(crops, candidateRules);
    }

    const start = performance.now();
    const results = service.evaluateBed(crops, candidateRules);
    const duration = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(20);
  });
});
