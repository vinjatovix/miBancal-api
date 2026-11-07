import { describe, expect, it } from '@jest/globals';

import { toLocationResponse } from '../../../../../src/apps/agroApi/controllers/Locations/locationResponse.js';
import { LocationFactory } from '../../../../Contexts/Agro/Locations/domain/mothers/LocationFactory.js';

describe('toLocationResponse', () => {
  it('maps coordinates and audit fields exactly', () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });

    const response = toLocationResponse(location);

    expect(response).toEqual({
      id: location.id,
      name: location.name,
      latitude: 40.4168,
      longitude: -3.7038,
      createdAt: location.metadata.createdAt,
      createdBy: location.metadata.createdBy,
      updatedAt: location.metadata.updatedAt,
      updatedBy: location.metadata.updatedBy
    });
  });

  it('never leaks internal status fields', () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });

    const response = toLocationResponse(location);

    expect('status' in response).toBe(false);
    expect('deletedAt' in response).toBe(false);
  });

  it('omits coordinates when location has no coordinates', () => {
    const location = LocationFactory.domainBase({
      latitude: undefined,
      longitude: undefined
    });

    const response = toLocationResponse(location);

    expect('latitude' in response).toBe(false);
    expect('longitude' in response).toBe(false);
  });
});
