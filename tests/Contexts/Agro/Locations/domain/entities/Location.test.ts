import { describe, expect, it } from '@jest/globals';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { LocationFactory } from '../mothers/LocationFactory.js';

const USER = 'grower';

describe('Location aggregate', () => {
  describe('create', () => {
    it('starts active at version 0 with no deletedAt and assigned coordinates', () => {
      const location = LocationFactory.domainBase({
        latitude: 40.4168,
        longitude: -3.7038
      });

      expect(location.status).toBe('active');
      expect(location.version).toBe(0);
      expect(location.isDeleted()).toBe(false);
      expect(location.deletedAt).toBeUndefined();
      expect(location.latitude).toBe(40.4168);
      expect(location.longitude).toBe(-3.7038);
    });

    it('creates a location without coordinates', () => {
      const location = LocationFactory.domainBase({
        latitude: undefined,
        longitude: undefined
      });

      expect(location.latitude).toBeUndefined();
      expect(location.longitude).toBeUndefined();
    });

    it('rejects partial coordinates when only latitude is provided', () => {
      const createLocation = () =>
        LocationFactory.domainBase({
          latitude: 40.4168,
          longitude: undefined
        });

      expect(createLocation).toThrow(InvalidArgumentException);
    });

    it('rejects partial coordinates when only longitude is provided', () => {
      const createLocation = () =>
        LocationFactory.domainBase({
          latitude: undefined,
          longitude: -3.7038
        });

      expect(createLocation).toThrow(InvalidArgumentException);
    });

    it('trims the name', () => {
      const location = LocationFactory.domainBase({ name: '  Huerto  ' });

      expect(location.name).toBe('Huerto');
    });

    it.each(['', '   ', 'a'.repeat(101)])(
      'rejects a name outside 1..100 characters (%s)',
      (name) => {
        const createLocation = () => LocationFactory.domainBase({ name });

        expect(createLocation).toThrow(InvalidArgumentException);
      }
    );

    it.each([-91, 91, Number.NaN])(
      'rejects invalid latitude %p on creation',
      (invalidLatitude) => {
        const createLocation = () =>
          LocationFactory.domainBase({
            latitude: invalidLatitude,
            longitude: 0
          });

        expect(createLocation).toThrow(InvalidArgumentException);
      }
    );

    it.each([-181, 181, Number.NaN])(
      'rejects invalid longitude %p on creation',
      (invalidLongitude) => {
        const createLocation = () =>
          LocationFactory.domainBase({
            latitude: 0,
            longitude: invalidLongitude
          });

        expect(createLocation).toThrow(InvalidArgumentException);
      }
    );

    it.each([-1, 360, 45.5])(
      'rejects invalid northAngle %p on creation',
      (invalidNorthAngle) => {
        const createLocation = () =>
          LocationFactory.domainBase({
            northAngle: invalidNorthAngle
          });

        expect(createLocation).toThrow(InvalidArgumentException);
      }
    );

    it.each([-90.0001, -91, 90.0001, 91, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects invalid latitude %p',
      (latitude) => {
        const createLocation = () => LocationFactory.domainBase({ latitude });

        expect(createLocation).toThrow(InvalidArgumentException);
      }
    );

    it.each([
      -180.0001,
      -181,
      180.0001,
      181,
      Number.NaN,
      Number.NEGATIVE_INFINITY
    ])('rejects invalid longitude %p', (longitude) => {
      const createLocation = () => LocationFactory.domainBase({ longitude });

      expect(createLocation).toThrow(InvalidArgumentException);
    });

    it('rejects an active location with deletedAt', () => {
      const createLocation = () =>
        LocationFactory.domainBase({ status: 'active', deletedAt: new Date() });

      expect(createLocation).toThrow(InvalidArgumentException);
    });

    it('rejects a deleted location without deletedAt', () => {
      const createLocation = () =>
        LocationFactory.domainBase({ status: 'deleted' });

      expect(createLocation).toThrow(InvalidArgumentException);
    });
  });

  describe('rename', () => {
    it('updates the name and audit metadata', () => {
      const location = LocationFactory.domainBase({ name: 'Huerto' });
      const before = location.metadata.updatedAt;

      location.rename('Nuevo huerto', USER, new Date(before.getTime() + 1000));

      expect(location.name).toBe('Nuevo huerto');
      expect(location.metadata.updatedBy).toBe(USER);
      expect(location.metadata.updatedAt.getTime()).toBeGreaterThan(
        before.getTime()
      );
    });

    it('is a no-op when the name does not change', () => {
      const location = LocationFactory.domainBase({ name: 'Huerto' });
      const before = location.metadata.updatedAt;

      location.rename('Huerto', USER, new Date(before.getTime() + 1000));

      expect(location.metadata.updatedAt).toEqual(before);
    });

    it.each(['', '   ', 'a'.repeat(101)])(
      'rejects a replacement name outside 1..100 characters (%s)',
      (invalidName) => {
        const location = LocationFactory.domainBase({ name: 'Huerto' });

        const renameAction = () =>
          location.rename(invalidName, USER, new Date());

        expect(renameAction).toThrow(InvalidArgumentException);
      }
    );

    it('rejects renaming an already-deleted location', () => {
      const location = LocationFactory.deleted();

      const renameAction = () =>
        location.rename('Nuevo nombre', USER, new Date());

      expect(renameAction).toThrow(DomainConflictException);
    });
  });

  describe('updateCoordinates', () => {
    it('updates latitude and longitude and updates audit metadata', () => {
      const location = LocationFactory.domainBase({
        latitude: 40.4168,
        longitude: -3.7038
      });
      const before = location.metadata.updatedAt;
      const updateTime = new Date(before.getTime() + 1000);

      location.updateCoordinates(
        { latitude: 41.3879, longitude: 2.1699 },
        USER,
        updateTime
      );

      expect(location.latitude).toBe(41.3879);
      expect(location.longitude).toBe(2.1699);
      expect(location.metadata.updatedBy).toBe(USER);
      expect(location.metadata.updatedAt).toEqual(updateTime);
    });

    it('clears coordinates when null is provided for both', () => {
      const location = LocationFactory.domainBase({
        latitude: 40.4168,
        longitude: -3.7038
      });
      const before = location.metadata.updatedAt;
      const updateTime = new Date(before.getTime() + 1000);

      location.updateCoordinates(
        { latitude: null, longitude: null },
        USER,
        updateTime
      );

      expect(location.latitude).toBeUndefined();
      expect(location.longitude).toBeUndefined();
      expect(location.metadata.updatedBy).toBe(USER);
      expect(location.metadata.updatedAt).toEqual(updateTime);
    });

    it('is a no-op when clearing already-cleared coordinates', () => {
      const location = LocationFactory.domainBase({
        latitude: undefined,
        longitude: undefined
      });
      const before = location.metadata.updatedAt;

      location.updateCoordinates(
        { latitude: null, longitude: null },
        USER,
        new Date(before.getTime() + 1000)
      );

      expect(location.metadata.updatedAt).toEqual(before);
    });

    it('rejects partial coordinates with null latitude and numeric longitude', () => {
      const location = LocationFactory.domainBase({
        latitude: 40.4168,
        longitude: -3.7038
      });

      const updateAction = () =>
        location.updateCoordinates(
          { latitude: null, longitude: 2.1699 },
          USER,
          new Date()
        );

      expect(updateAction).toThrow(InvalidArgumentException);
    });

    it('rejects partial coordinates with numeric latitude and null longitude', () => {
      const location = LocationFactory.domainBase({
        latitude: 40.4168,
        longitude: -3.7038
      });

      const updateAction = () =>
        location.updateCoordinates(
          { latitude: 41.3879, longitude: null },
          USER,
          new Date()
        );

      expect(updateAction).toThrow(InvalidArgumentException);
    });

    it('is a no-op when coordinates do not change', () => {
      const location = LocationFactory.domainBase({
        latitude: 40.4168,
        longitude: -3.7038
      });
      const before = location.metadata.updatedAt;

      location.updateCoordinates(
        { latitude: 40.4168, longitude: -3.7038 },
        USER,
        new Date(before.getTime() + 1000)
      );

      expect(location.metadata.updatedAt).toEqual(before);
    });

    it('rejects updating coordinates on an already-deleted location', () => {
      const location = LocationFactory.deleted();

      const updateAction = () =>
        location.updateCoordinates(
          { latitude: 41.3879, longitude: 2.1699 },
          USER,
          new Date()
        );

      expect(updateAction).toThrow(DomainConflictException);
    });

    it.each([-90.0001, -91, 90.0001, 91, Number.NaN])(
      'rejects invalid replacement latitude %p',
      (invalidLatitude) => {
        const location = LocationFactory.domainBase({});

        const updateAction = () =>
          location.updateCoordinates(
            { latitude: invalidLatitude, longitude: 0 },
            USER,
            new Date()
          );

        expect(updateAction).toThrow(InvalidArgumentException);
      }
    );

    it.each([-180.0001, -181, 180.0001, 181, Number.NaN])(
      'rejects invalid replacement longitude %p',
      (invalidLongitude) => {
        const location = LocationFactory.domainBase({});

        const updateAction = () =>
          location.updateCoordinates(
            { latitude: 0, longitude: invalidLongitude },
            USER,
            new Date()
          );

        expect(updateAction).toThrow(InvalidArgumentException);
      }
    );
  });

  describe('markAsDeleted', () => {
    it('sets status deleted and deletedAt', () => {
      const location = LocationFactory.domainBase({});
      const at = new Date();

      location.markAsDeleted(USER, at);

      expect(location.status).toBe('deleted');
      expect(location.deletedAt).toEqual(at);
      expect(location.isDeleted()).toBe(true);
    });

    it('rejects deleting an already-deleted location', () => {
      const location = LocationFactory.deleted();

      const deleteAction = () => location.markAsDeleted(USER, new Date());

      expect(deleteAction).toThrow(DomainConflictException);
    });
  });

  describe('syncVersion', () => {
    it('advances the version after a written outcome', () => {
      const location = LocationFactory.domainBase({});

      location.syncVersion('written');

      expect(location.version).toBe(1);
    });

    it('leaves the version unchanged after an unchanged outcome', () => {
      const location = LocationFactory.domainBase({});

      location.syncVersion('unchanged');

      expect(location.version).toBe(0);
    });
  });
});
