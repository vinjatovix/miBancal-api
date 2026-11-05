import { describe, expect, it } from '@jest/globals';
import { toBedGeographicSnapshot } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/toBedGeographicSnapshot.js';
import { LocationFactory } from '../../../Locations/domain/mothers/LocationFactory.js';

describe('toBedGeographicSnapshot', () => {
  it('extracts latitude and longitude from location with coordinates', () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });

    const snapshot = toBedGeographicSnapshot(location);

    expect(snapshot).toEqual({
      latitude: 40.4168,
      longitude: -3.7038
    });
  });

  it('returns null when location coordinates are undefined', () => {
    const location = LocationFactory.withoutCoordinates();

    const snapshot = toBedGeographicSnapshot(location);

    expect(snapshot).toBeNull();
  });
});
