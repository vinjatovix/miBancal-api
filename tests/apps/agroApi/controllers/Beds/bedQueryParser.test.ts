import { describe, expect, it } from '@jest/globals';

import {
  parseBedIncludes,
  parseBedLocationFilter
} from '../../../../../src/apps/agroApi/controllers/Beds/bedQueryParser.js';

describe('bedQueryParser', () => {
  describe('parseBedIncludes', () => {
    it.each([
      [undefined, false, false],
      ['', false, false],
      ['plantInstances', true, false],
      ['location', false, true],
      ['plantInstances,location', true, true],
      ['location,plantInstances', true, true],
      ['plantInstances, location', true, true],
      ['unknown', false, false]
    ])(
      'parses include="%s" to embedCrops=%s and embedLocation=%s',
      (include, expectedEmbedCrops, expectedEmbedLocation) => {
        const result = parseBedIncludes(include);

        expect(result).toEqual({
          embedCrops: expectedEmbedCrops,
          embedLocation: expectedEmbedLocation
        });
      }
    );
  });

  describe('parseBedLocationFilter', () => {
    it.each([
      ['empty query', {}, undefined],
      ['filter without locationId', { filter: { name: 'Bed' } }, undefined],
      ['null filter', { filter: null }, undefined],
      [
        'filter.locationId string',
        { filter: { locationId: '11111111-1111-4111-8111-111111111111' } },
        '11111111-1111-4111-8111-111111111111'
      ],
      [
        'filter.locationId.eq object',
        {
          filter: {
            locationId: { eq: '22222222-2222-4222-8222-222222222222' }
          }
        },
        '22222222-2222-4222-8222-222222222222'
      ],
      [
        'bracket query filter[locationId]',
        {
          'filter[locationId]': '33333333-3333-4333-8333-333333333333'
        },
        '33333333-3333-4333-8333-333333333333'
      ],
      [
        'canonical bracket query filter[locationId][eq]',
        {
          'filter[locationId][eq]': '44444444-4444-4444-8444-444444444444'
        },
        '44444444-4444-4444-8444-444444444444'
      ]
    ])('parses %s correctly', (_label, query, expectedLocationId) => {
      const result = parseBedLocationFilter(query);

      expect(result).toBe(expectedLocationId);
    });
  });
});
