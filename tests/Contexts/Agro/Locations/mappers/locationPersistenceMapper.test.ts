import { describe, expect, it } from '@jest/globals';
import { locationPersistenceMapper } from '../../../../../src/Contexts/Agro/Locations/mappers/locationPersistenceMapper.js';
import { LocationFactory } from '../domain/mothers/LocationFactory.js';

describe('locationPersistenceMapper', () => {
  it('maps flat coordinates in the stored document', () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });

    const document = locationPersistenceMapper.toMongoDocument(location);

    expect(document.latitude).toBe(40.4168);
    expect(document.longitude).toBe(-3.7038);
    expect('deletedAt' in document).toBe(false);
  });

  it('round-trips a document with coordinates', () => {
    const location = LocationFactory.domainBase({
      latitude: 41.3879,
      longitude: 2.1699
    });

    const document = locationPersistenceMapper.toMongoDocument(location);
    const roundTripped = locationPersistenceMapper.fromMongoDocument(document);

    expect(roundTripped.id).toBe(location.id);
    expect(roundTripped.name).toBe(location.name);
    expect(roundTripped.latitude).toBe(41.3879);
    expect(roundTripped.longitude).toBe(2.1699);
  });
});
