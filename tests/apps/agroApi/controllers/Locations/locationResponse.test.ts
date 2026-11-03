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

  it('never leaks internal status or legacy geographic fields', () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });

    const response = toLocationResponse(location);

    expect('status' in response).toBe(false);
    expect('deletedAt' in response).toBe(false);
    expect('postalCode' in response).toBe(false);
    expect('country' in response).toBe(false);
    expect('timezone' in response).toBe(false);
    expect('hemisphere' in response).toBe(false);
  });
});
