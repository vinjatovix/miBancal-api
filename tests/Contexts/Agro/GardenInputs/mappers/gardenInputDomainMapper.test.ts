import { GardenInput } from '../../../../../src/Contexts/Agro/GardenInputs/domain/entities/GardenInput.js';
import { gardenInputDomainMapper } from '../../../../../src/Contexts/Agro/GardenInputs/mappers/gardenInputDomainMapper.js';
import { GardenInputMother } from '../domain/mothers/GardenInputMother.js';

describe('gardenInputDomainMapper', () => {
  it('rebuilds a GardenInput from primitives (round-trip)', () => {
    const primitives = GardenInputMother.primitivesBase();

    const gardenInput = gardenInputDomainMapper.fromPrimitives(primitives);

    expect(gardenInput).toBeInstanceOf(GardenInput);
    expect(gardenInputDomainMapper.toPrimitives(gardenInput)).toEqual(
      primitives
    );
  });

  it('omits empty optional fields from primitives', () => {
    const gardenInput = GardenInput.create(
      GardenInputMother.propsBase({
        actions: [],
        targets: []
      })
    );

    const primitives = gardenInputDomainMapper.toPrimitives(gardenInput);

    expect(primitives).not.toHaveProperty('actions');
    expect(primitives).not.toHaveProperty('targets');
    expect(primitives).not.toHaveProperty('deletedAt');
  });

  it('serialises deletedAt as an ISO string for a deleted garden input', () => {
    const gardenInput = GardenInput.create(GardenInputMother.propsBase());
    gardenInput.markAsDeleted('curator');

    const primitives = gardenInputDomainMapper.toPrimitives(gardenInput);

    expect(typeof primitives.deletedAt).toBe('string');
    expect(primitives.status).toBe('deleted');
  });
});
