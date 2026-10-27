import { GardenInput } from '../../../../../src/Contexts/Agro/GardenInputs/domain/entities/GardenInput.js';
import { gardenInputDomainMapper } from '../../../../../src/Contexts/Agro/GardenInputs/mappers/gardenInputDomainMapper.js';
import { gardenInputPersistenceMapper } from '../../../../../src/Contexts/Agro/GardenInputs/mappers/gardenInputPersistenceMapperImpl.js';
import { GardenInputMother } from '../domain/mothers/GardenInputMother.js';

describe('gardenInputPersistenceMapper', () => {
  it('rebuilds a GardenInput from a Mongo document', () => {
    const document = GardenInputMother.mongoBase();

    const gardenInput =
      gardenInputPersistenceMapper.fromMongoDocument(document);

    expect(gardenInput).toBeInstanceOf(GardenInput);
    expect(gardenInput.slug).toBe(document.slug);
    expect(gardenInput.category).toBe(document.category);
  });

  it('omits empty optional fields and deletedAt for active garden input', () => {
    const gardenInput = GardenInput.create(
      GardenInputMother.propsBase({ actions: [] })
    );

    const document = gardenInputPersistenceMapper.toMongoDocument(gardenInput);

    expect(document).not.toHaveProperty('actions');
    expect(document).not.toHaveProperty('deletedAt');
  });

  it('keeps deletedAt as a Date for a deleted garden input', () => {
    const gardenInput = GardenInput.create(GardenInputMother.propsBase());
    gardenInput.markAsDeleted('curator');

    const document = gardenInputPersistenceMapper.toMongoDocument(gardenInput);

    expect(document.deletedAt).toBeInstanceOf(Date);
    expect(document.status).toBe('deleted');
  });

  it('hydrates a string deletedAt as a Date', () => {
    const deletedAt = '2026-01-01T00:00:00.000Z';
    const document = GardenInputMother.mongoBase({
      status: 'deleted',
      deletedAt
    });

    const gardenInput =
      gardenInputPersistenceMapper.fromMongoDocument(document);

    expect(gardenInput.deletedAt).toBeInstanceOf(Date);
    expect(gardenInputDomainMapper.toPrimitives(gardenInput).deletedAt).toBe(
      deletedAt
    );
  });
});
