import { describe, expect, it } from '@jest/globals';

import { Latitude } from '../../../../../../src/Contexts/Agro/Locations/domain/value-objects/Latitude.js';
import { Longitude } from '../../../../../../src/Contexts/Agro/Locations/domain/value-objects/Longitude.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';

describe('Latitude', () => {
  describe('valid coordinates', () => {
    it.each([-90, -45.5, 0, 40.4168, 90])(
      'instantiates with valid latitude %p',
      (validValue) => {
        const latitude = new Latitude(validValue);

        expect(latitude.value).toBe(validValue);
        expect(latitude.toPrimitives()).toBe(validValue);
      }
    );

    it('returns true when comparing equal latitude values', () => {
      const latitude1 = new Latitude(40.4168);
      const latitude2 = new Latitude(40.4168);

      const areEqual = latitude1.equals(latitude2);

      expect(areEqual).toBe(true);
    });

    it('returns false when comparing different latitude values', () => {
      const latitude1 = new Latitude(40.4168);
      const latitude2 = new Latitude(41.3879);

      const areEqual = latitude1.equals(latitude2);

      expect(areEqual).toBe(false);
    });
  });

  describe('invalid coordinates', () => {
    it.each([
      -90.0001,
      -91,
      -180,
      90.0001,
      91,
      180,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ])(
      'throws InvalidArgumentException for out-of-range or non-finite latitude %p',
      (invalidValue) => {
        const createLatitude = () => new Latitude(invalidValue);

        expect(createLatitude).toThrow(InvalidArgumentException);
      }
    );
  });
});

describe('Longitude', () => {
  describe('valid coordinates', () => {
    it.each([-180, -90, 0, -3.7038, 180])(
      'instantiates with valid longitude %p',
      (validValue) => {
        const longitude = new Longitude(validValue);

        expect(longitude.value).toBe(validValue);
        expect(longitude.toPrimitives()).toBe(validValue);
      }
    );

    it('returns true when comparing equal longitude values', () => {
      const longitude1 = new Longitude(-3.7038);
      const longitude2 = new Longitude(-3.7038);

      const areEqual = longitude1.equals(longitude2);

      expect(areEqual).toBe(true);
    });

    it('returns false when comparing different longitude values', () => {
      const longitude1 = new Longitude(-3.7038);
      const longitude2 = new Longitude(2.1699);

      const areEqual = longitude1.equals(longitude2);

      expect(areEqual).toBe(false);
    });
  });

  describe('invalid coordinates', () => {
    it.each([
      -180.0001,
      -181,
      -360,
      180.0001,
      181,
      360,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    ])(
      'throws InvalidArgumentException for out-of-range or non-finite longitude %p',
      (invalidValue) => {
        const createLongitude = () => new Longitude(invalidValue);

        expect(createLongitude).toThrow(InvalidArgumentException);
      }
    );
  });
});
