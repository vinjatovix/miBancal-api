import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { LocationFactory } from '../mothers/LocationFactory.js';

const USER = 'grower';

describe('Location aggregate', () => {
  describe('create', () => {
    it('starts active at version 0 with no deletedAt', () => {
      const location = LocationFactory.domainBase();

      expect(location.status).toBe('active');
      expect(location.version).toBe(0);
      expect(location.isDeleted()).toBe(false);
      expect(location.deletedAt).toBeUndefined();
    });

    it('trims the name', () => {
      const location = LocationFactory.domainBase({ name: '  Huerto  ' });

      expect(location.name).toBe('Huerto');
    });

    it.each(['', '   ', 'a'.repeat(101)])(
      'rejects a name outside 1..100 characters (%s)',
      (name) => {
        expect(() => LocationFactory.domainBase({ name })).toThrow(
          InvalidArgumentException
        );
      }
    );

    it('rejects a postalCode outside 1..20 characters', () => {
      expect(() =>
        LocationFactory.domainBase({ postalCode: 'a'.repeat(21) })
      ).toThrow(InvalidArgumentException);
    });

    it('rejects a country outside 1..100 characters', () => {
      expect(() =>
        LocationFactory.domainBase({ country: 'a'.repeat(101) })
      ).toThrow(InvalidArgumentException);
    });

    it('accepts a canonical IANA timezone or UTC', () => {
      expect(() =>
        LocationFactory.domainBase({ timezone: 'UTC' })
      ).not.toThrow();
      expect(() =>
        LocationFactory.domainBase({
          timezone: 'America/Argentina/Buenos_Aires'
        })
      ).not.toThrow();
    });

    it('rejects an invalid timezone', () => {
      expect(() =>
        LocationFactory.domainBase({ timezone: 'Not/A_Timezone' })
      ).toThrow(InvalidArgumentException);
    });

    it.each(['north', 'south'] as const)(
      'accepts hemisphere %s',
      (hemisphere) => {
        expect(() => LocationFactory.domainBase({ hemisphere })).not.toThrow();
      }
    );

    it('rejects an active location with deletedAt', () => {
      expect(() =>
        LocationFactory.domainBase({ status: 'active', deletedAt: new Date() })
      ).toThrow(InvalidArgumentException);
    });

    it('rejects a deleted location without deletedAt', () => {
      expect(() => LocationFactory.domainBase({ status: 'deleted' })).toThrow(
        InvalidArgumentException
      );
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
  });

  describe('updateGeography', () => {
    it('sets a provided field', () => {
      const location = LocationFactory.domainBase({});

      location.updateGeography({ country: 'Argentina' }, USER, new Date());

      expect(location.country).toBe('Argentina');
    });

    it('unsets a field with null', () => {
      const location = LocationFactory.domainBase({ country: 'Argentina' });

      location.updateGeography({ country: null }, USER, new Date());

      expect(location.country).toBeUndefined();
    });

    it('leaves an omitted field unchanged', () => {
      const location = LocationFactory.domainBase({ country: 'Argentina' });

      location.updateGeography({ postalCode: '5500' }, USER, new Date());

      expect(location.country).toBe('Argentina');
      expect(location.postalCode).toBe('5500');
    });

    it('is a no-op when nothing resolves to a different value', () => {
      const location = LocationFactory.domainBase({ country: 'Argentina' });
      const before = location.metadata.updatedAt;

      location.updateGeography(
        { country: 'Argentina' },
        USER,
        new Date(before.getTime() + 1000)
      );

      expect(location.metadata.updatedAt).toEqual(before);
    });
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

      expect(() => location.markAsDeleted(USER, new Date())).toThrow(
        DomainConflictException
      );
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
