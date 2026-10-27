import {
  toGardenInputReadView,
  toGardenInputSparseView
} from '../../../../../../src/Contexts/Agro/GardenInputs/infrastructure/persistence/gardenInputReadViewMapper.js';
import { SupportResourceBuilder } from '../../../shared/domain/supportResource/SupportResourceBuilder.js';
import { GardenInputMother } from '../../domain/mothers/GardenInputMother.js';

describe('gardenInputReadViewMapper', () => {
  it('projects all contract fields and omits deletedAt for active garden input', () => {
    const view = toGardenInputReadView(GardenInputMother.mongoBase());

    expect(view.status).toBe('active');
    expect(view.slug).toBe('jabon-potasico');
    expect(view.category).toBe('defense');
    expect(view.actions).toEqual(['insecticide']);
    expect(view.recipes).toHaveLength(1);
    expect(view.recipes?.[0]?.dosage.method).toBe('foliar');
    expect(view.version).toBe(0);
    expect(view).not.toHaveProperty('deletedAt');
    expect(view.metadata.createdAt).toBeInstanceOf(Date);
  });

  it('exposes deletedAt as an ISO string for a deleted garden input', () => {
    const deletedAt = new Date();
    const view = toGardenInputReadView(
      GardenInputMother.mongoBase({ status: 'deleted', deletedAt })
    );

    expect(view.status).toBe('deleted');
    expect(view.deletedAt).toBe(deletedAt.toISOString());
  });

  it('surfaces stored support resources on the read view', () => {
    const resource = SupportResourceBuilder.video();
    const view = toGardenInputReadView(
      GardenInputMother.mongoBase({
        resources: [resource]
      })
    );

    expect(view.resources).toStrictEqual([resource]);
  });

  it('returns only id and requested fields for a sparse view', () => {
    const sparse = toGardenInputSparseView(GardenInputMother.mongoBase(), [
      'slug',
      'name',
      'category'
    ]);

    expect(Object.keys(sparse).sort()).toEqual([
      'category',
      'id',
      'name',
      'slug'
    ]);
  });
});
