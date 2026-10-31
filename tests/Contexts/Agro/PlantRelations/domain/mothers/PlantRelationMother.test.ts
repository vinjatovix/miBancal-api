import { Binary } from 'bson';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { PlantRelationMother } from './PlantRelationMother.js';

describe('PlantRelationMother', () => {
  const PLANT_A_ID = createPlantId('0192e200-0000-7000-8000-000000000001');
  const PLANT_B_ID = createPlantId('0192e200-0000-7000-8000-000000000002');

  it('creates a default PlantRelation aggregate', () => {
    const relation = PlantRelationMother.create();

    expect(relation.type).toBe('beneficial');
    expect(relation.mechanism).toBe('pest_repellent');
    expect(relation.strength).toBe(4);
    expect(relation.version).toBe(0);
    expect(relation.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('creates a beneficial relation between specific plants', () => {
    const relation = PlantRelationMother.beneficial(PLANT_A_ID, PLANT_B_ID);

    expect(relation.sourcePlantId).toBe(PLANT_A_ID);
    expect(relation.targetPlantId).toBe(PLANT_B_ID);
    expect(relation.type).toBe('beneficial');
  });

  it('creates a detrimental relation between specific plants', () => {
    const relation = PlantRelationMother.detrimental(PLANT_A_ID, PLANT_B_ID);

    expect(relation.sourcePlantId).toBe(PLANT_A_ID);
    expect(relation.targetPlantId).toBe(PLANT_B_ID);
    expect(relation.type).toBe('detrimental');
  });

  it('builds parameters object with overrides', () => {
    const params = PlantRelationMother.parameters({ strength: 5 });

    expect(params.strength).toBe(5);
    expect(params.type).toBe('beneficial');
  });

  it('builds primitives with defaults', () => {
    const primitives = PlantRelationMother.primitives();

    expect(primitives.version).toBe(0);
    expect(primitives.strength).toBe(4);
  });

  it('builds MongoDB document fixture with BSON Binary identifiers', () => {
    const doc = PlantRelationMother.mongoDocument();

    expect(doc._id).toBeInstanceOf(Binary);
    expect(doc.sourcePlantId).toBeInstanceOf(Binary);
    expect(doc.targetPlantId).toBeInstanceOf(Binary);
  });
});
