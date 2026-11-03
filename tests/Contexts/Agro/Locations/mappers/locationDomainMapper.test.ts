import { describe, expect, it } from '@jest/globals';
import { locationDomainMapper } from '../../../../../src/Contexts/Agro/Locations/mappers/locationDomainMapper.js';
import { LocationFactory } from '../domain/mothers/LocationFactory.js';

describe('locationDomainMapper', () => {
  it('maps flat coordinates', () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });

    const primitives = locationDomainMapper.toPrimitives(location);

    expect(primitives.latitude).toBe(40.4168);
    expect(primitives.longitude).toBe(-3.7038);
    expect(primitives.deletedAt).toBeUndefined();
    expect(JSON.stringify(primitives)).not.toContain('null');
  });

  it('round-trips a location with coordinates', () => {
    const location = LocationFactory.domainBase({
      latitude: 41.3879,
      longitude: 2.1699
    });

    const primitives = locationDomainMapper.toPrimitives(location);
    const roundTripped = locationDomainMapper.fromPrimitives(primitives);

    expect(roundTripped.id).toBe(location.id);
    expect(roundTripped.name).toBe(location.name);
    expect(roundTripped.latitude).toBe(41.3879);
    expect(roundTripped.longitude).toBe(2.1699);
    expect(roundTripped.status).toBe(location.status);
    expect(roundTripped.version).toBe(location.version);
  });

  it('serializes deletedAt only when the location is deleted', () => {
    const location = LocationFactory.deleted();

    const primitives = locationDomainMapper.toPrimitives(location);

    expect(primitives.status).toBe('deleted');
    expect(primitives.deletedAt).toBeDefined();
  });
});
