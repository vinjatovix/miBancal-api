import { toBedResponse } from '../../../../../src/apps/agroApi/controllers/Beds/bedResponse.js';
import { BedFactory } from '../../../../Contexts/Agro/Beds/domain/mothers/BedFactory.js';

describe('toBedResponse', () => {
  it('includes geographic fields when present on bed', () => {
    const bed = BedFactory.create({
      postalCode: 'C1001',
      country: 'Argentina',
      timezone: 'America/Argentina/Buenos_Aires',
      hemisphere: 'south'
    });

    const response = toBedResponse({ bed, cropIds: [] });

    expect(response.postalCode).toBe('C1001');
    expect(response.country).toBe('Argentina');
    expect(response.timezone).toBe('America/Argentina/Buenos_Aires');
    expect(response.hemisphere).toBe('south');
  });

  it('omits geographic fields when absent on bed', () => {
    const bed = BedFactory.create();

    const response = toBedResponse({ bed, cropIds: [] });

    expect(response.postalCode).toBeUndefined();
    expect(response.country).toBeUndefined();
    expect(response.timezone).toBeUndefined();
    expect(response.hemisphere).toBeUndefined();
  });
});
