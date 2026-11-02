import { locationPersistenceMapper } from '../../../../../src/Contexts/Agro/Locations/mappers/locationPersistenceMapper.js';
import { LocationFactory } from '../domain/mothers/LocationFactory.js';

describe('locationPersistenceMapper', () => {
  it('omits absent optional fields in the stored document', () => {
    const location = LocationFactory.domainBase({});

    const document = locationPersistenceMapper.toMongoDocument(location);

    expect('postalCode' in document).toBe(false);
    expect('country' in document).toBe(false);
    expect('timezone' in document).toBe(false);
    expect('hemisphere' in document).toBe(false);
    expect('deletedAt' in document).toBe(false);
  });

  it('round-trips a document with geographic fields', () => {
    const location = LocationFactory.domainBase({
      postalCode: 'C1001',
      country: 'Argentina'
    });

    const roundTripped = locationPersistenceMapper.fromMongoDocument(
      locationPersistenceMapper.toMongoDocument(location)
    );

    expect(roundTripped.postalCode).toBe('C1001');
    expect(roundTripped.country).toBe('Argentina');
  });
});
