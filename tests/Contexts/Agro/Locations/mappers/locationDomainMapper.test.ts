import { locationDomainMapper } from '../../../../../src/Contexts/Agro/Locations/mappers/locationDomainMapper.js';
import { LocationFactory } from '../domain/mothers/LocationFactory.js';

describe('locationDomainMapper', () => {
  it('omits absent optional fields, never emitting null', () => {
    const location = LocationFactory.domainBase({});

    const primitives = locationDomainMapper.toPrimitives(location);

    expect(primitives.postalCode).toBeUndefined();
    expect(primitives.country).toBeUndefined();
    expect(primitives.timezone).toBeUndefined();
    expect(primitives.hemisphere).toBeUndefined();
    expect(primitives.deletedAt).toBeUndefined();
    expect(JSON.stringify(primitives)).not.toContain('null');
  });

  it('round-trips a fully populated location', () => {
    const location = LocationFactory.domainBase({
      postalCode: 'C1001',
      country: 'Argentina',
      timezone: 'America/Argentina/Buenos_Aires',
      hemisphere: 'south'
    });

    const roundTripped = locationDomainMapper.fromPrimitives(
      locationDomainMapper.toPrimitives(location)
    );

    expect(roundTripped.id).toBe(location.id);
    expect(roundTripped.postalCode).toBe('C1001');
    expect(roundTripped.country).toBe('Argentina');
    expect(roundTripped.timezone).toBe('America/Argentina/Buenos_Aires');
    expect(roundTripped.hemisphere).toBe('south');
  });

  it('serializes deletedAt only when the location is deleted', () => {
    const location = LocationFactory.deleted();

    const primitives = locationDomainMapper.toPrimitives(location);

    expect(primitives.status).toBe('deleted');
    expect(primitives.deletedAt).toBeDefined();
  });
});
