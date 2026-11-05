import { toBedResponse } from '../../../../../src/apps/agroApi/controllers/Beds/bedResponse.js';
import { BedFactory } from '../../../../Contexts/Agro/Beds/domain/mothers/BedFactory.js';

describe('toBedResponse', () => {
  it('includes coordinates when present on bed', () => {
    const bed = BedFactory.create({
      latitude: 40.4168,
      longitude: -3.7038
    });

    const response = toBedResponse({ bed, cropIds: [] });

    expect(response.latitude).toBe(40.4168);
    expect(response.longitude).toBe(-3.7038);
  });

  it('includes locationId when present on bed', () => {
    const locationId = '11111111-1111-4111-8111-111111111111';
    const bed = BedFactory.create({ locationId });

    const response = toBedResponse({ bed, cropIds: [] });

    expect(response.locationId).toBe(locationId);
  });

  it('returns locationId as null when bed has null locationId', () => {
    const bed = BedFactory.create({ locationId: null });

    const response = toBedResponse({ bed, cropIds: [] });

    expect(response.locationId).toBeNull();
  });

  it('omits coordinates and legacy fields when absent on bed', () => {
    const bed = BedFactory.create();

    const response = toBedResponse({ bed, cropIds: [] });

    expect(response.latitude).toBeUndefined();
    expect(response.longitude).toBeUndefined();
    expect('postalCode' in response).toBe(false);
    expect('country' in response).toBe(false);
    expect('timezone' in response).toBe(false);
    expect('hemisphere' in response).toBe(false);
  });
});
