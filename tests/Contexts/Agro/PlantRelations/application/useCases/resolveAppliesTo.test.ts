import type { PlantRelationReadView } from '../../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import {
  annotateAppliesTo,
  deriveGenus
} from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/resolveAppliesTo.js';
import type { AppliesToScope } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationFilter.js';

const PLANT_ID = '0192e200-0000-7000-8000-000000000001';
const FAMILY_ID = '0192e100-0000-7000-8000-000000000009';
const OTHER = '0192e200-0000-7000-8000-0000000000aa';

const view = (
  source: PlantRelationReadView['source'],
  target: PlantRelationReadView['target']
): PlantRelationReadView => ({
  id: '0192e201-0000-7000-8000-000000000001',
  source,
  target,
  type: 'beneficial',
  mechanism: 'pest_repellent',
  strength: 3,
  proximity: { minDistanceCm: 0, maxDistanceCm: null },
  reason: 'because',
  metadata: {
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    createdBy: 'system',
    updatedAt: new Date('2026-10-28T12:00:00.000Z'),
    updatedBy: 'system'
  },
  version: 0
});

describe('deriveGenus', () => {
  it('capitalizes the first word of a lower-case scientific name', () => {
    expect(deriveGenus('solanum lycopersicum')).toBe('Solanum');
  });

  it('normalizes regardless of the stored casing', () => {
    expect(deriveGenus('SOLANUM LYCOPERSICUM')).toBe('Solanum');
  });

  it('takes the genus even when a hybrid "×" marker follows it', () => {
    expect(deriveGenus('citrus × limon')).toBe('Citrus');
  });

  it('ignores surrounding whitespace', () => {
    expect(deriveGenus('  rosa   canina  ')).toBe('Rosa');
  });

  it('returns undefined for a leading hybrid "×" nothogenus', () => {
    expect(deriveGenus('× Citrofortunella microcarpa')).toBeUndefined();
  });

  it('returns undefined for empty or missing input', () => {
    expect(deriveGenus('')).toBeUndefined();
    expect(deriveGenus(undefined)).toBeUndefined();
  });
});

describe('annotateAppliesTo', () => {
  const appliesTo: AppliesToScope = {
    plantId: PLANT_ID,
    genus: 'Solanum',
    familyId: FAMILY_ID
  };

  it('tags a plant-scope source as plant/source', () => {
    const result = annotateAppliesTo(
      view(
        { scope: 'plant', value: PLANT_ID },
        { scope: 'plant', value: OTHER }
      ),
      appliesTo
    );

    expect(result).toMatchObject({ appliesVia: 'plant', role: 'source' });
  });

  it('tags a broadcast target as all/target', () => {
    const result = annotateAppliesTo(
      view({ scope: 'genus', value: 'Trifolium' }, { scope: 'all' }),
      appliesTo
    );

    expect(result).toMatchObject({ appliesVia: 'all', role: 'target' });
  });

  it('lets the narrower side shadow the broader one', () => {
    const result = annotateAppliesTo(
      view(
        { scope: 'genus', value: 'Solanum' },
        { scope: 'family', value: FAMILY_ID }
      ),
      appliesTo
    );

    expect(result).toMatchObject({ appliesVia: 'genus', role: 'source' });
  });

  it('breaks a specificity tie in favour of the target side', () => {
    const result = annotateAppliesTo(
      view(
        { scope: 'family', value: FAMILY_ID },
        { scope: 'genus', value: 'Solanum' }
      ),
      appliesTo
    );

    expect(result).toMatchObject({ appliesVia: 'genus', role: 'target' });
  });

  it('matches the family id case-insensitively', () => {
    const result = annotateAppliesTo(
      view(
        { scope: 'plant', value: OTHER },
        { scope: 'family', value: FAMILY_ID.toUpperCase() }
      ),
      appliesTo
    );

    expect(result).toMatchObject({ appliesVia: 'family', role: 'target' });
  });

  it('does not match the genus tier when the plant has no derivable genus', () => {
    const result = annotateAppliesTo(
      view(
        { scope: 'genus', value: 'Solanum' },
        { scope: 'plant', value: OTHER }
      ),
      { plantId: PLANT_ID }
    );

    expect(result.appliesVia).toBeUndefined();
    expect(result.role).toBeUndefined();
  });
});
