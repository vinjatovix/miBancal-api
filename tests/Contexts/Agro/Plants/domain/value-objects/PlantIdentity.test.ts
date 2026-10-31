import { randomFamilyId } from '../../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import type { IdentityPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/IdentityPrimitives.js';
import { PlantIdentity } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantIdentity.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantIdentityBuilder } from '../mothers/PlantIdentityBuilder.js';

/** The tomato identity, with `name` fields and top-level fields replaced. */
const tomato = (
  overrides: Partial<Omit<IdentityPrimitives, 'name'>> = {},
  name: Partial<IdentityPrimitives['name']> = {}
): IdentityPrimitives => {
  const base = PlantIdentityBuilder.tomato().toPrimitives();
  return { ...base, ...overrides, name: { ...base.name, ...name } };
};

describe('PlantIdentity', () => {
  describe('constructor', () => {
    it.each([
      ['name.primary', tomato({}, { primary: '   ' })],
      ['scientificName', tomato({ scientificName: '   ' })],
      ['family', tomato({ family: '   ' })]
    ])('should reject a blank %s', (field, primitives) => {
      const build = (): PlantIdentity => new PlantIdentity(primitives);

      expect(build).toThrow(InvalidArgumentException);
      expect(build).toThrow(field);
    });

    it('should reject a family that is not a valid id', () => {
      const primitives = tomato({ family: 'not-a-uuid' });

      expect(() => new PlantIdentity(primitives)).toThrow(
        InvalidArgumentException
      );
    });

    it('should trim its texts and family', () => {
      const family = randomFamilyId();
      const primitives = tomato(
        { scientificName: '  Solanum lycopersicum  ', family: `  ${family}  ` },
        { primary: '  Tomato  ' }
      );

      const identity = new PlantIdentity(primitives);

      expect(identity.name.primary).toBe('Tomato');
      expect(identity.scientificName).toBe('Solanum lycopersicum');
      expect(identity.family).toBe(family);
    });

    it('should trim aliases and drop empty ones', () => {
      const primitives = tomato(
        {},
        { aliases: [' tomatera ', '  ', 'cherry'] }
      );

      expect(new PlantIdentity(primitives).name.aliases).toEqual([
        'tomatera',
        'cherry'
      ]);
    });
  });

  describe('update', () => {
    it('should keep the fields the changes leave out', () => {
      const identity = PlantIdentityBuilder.withAliases();

      const updated = identity.update({ scientificName: 'Solanum' });

      expect(updated.name).toEqual(identity.name);
      expect(updated.family).toBe(identity.family);
      expect(updated.scientificName).toBe('Solanum');
    });

    it('should remove the aliases on null', () => {
      const identity = PlantIdentityBuilder.withAliases();

      const updated = identity.update({ name: { aliases: null } });

      expect(updated.name).not.toHaveProperty('aliases');
    });

    it('should reject a blank scientificName', () => {
      const identity = PlantIdentityBuilder.tomato();

      expect(() => identity.update({ scientificName: ' ' })).toThrow(
        /scientificName/
      );
    });
  });

  describe('primitives', () => {
    it.each([
      ['with aliases', PlantIdentityBuilder.withAliases()],
      ['without aliases', PlantIdentityBuilder.tomato()]
    ])('should round-trip an identity %s', (_, identity) => {
      const primitives = identity.toPrimitives();

      expect(PlantIdentity.fromPrimitives(primitives).toPrimitives()).toEqual(
        primitives
      );
    });

    it('should leave out aliases it does not have', () => {
      expect(
        PlantIdentityBuilder.tomato().toPrimitives().name
      ).not.toHaveProperty('aliases');
    });
  });

  describe('genus derivation', () => {
    it('should derive genus from scientificName', () => {
      const identity = PlantIdentityBuilder.tomato();
      expect(identity.genus).toBe('Solanum');
    });

    it('should derive genus capitalized from lowercase scientificName', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: 'allium sativum' })
      );
      expect(identity.genus).toBe('Allium');
    });

    it('should omit genus for hybrid prefix ×', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: '×Brassicoraphanus' })
      );
      expect(identity.genus).toBeUndefined();
    });

    it('should ignore incoming genus from primitives (drift-prevention)', () => {
      const primitives = {
        ...PlantIdentityBuilder.tomato().toPrimitives(),
        genus: 'Fake'
      };
      const identity = new PlantIdentity(primitives);
      expect(identity.genus).toBe('Solanum');
    });

    it('should emit genus in toPrimitives when derivable', () => {
      const primitives = PlantIdentityBuilder.tomato().toPrimitives();
      expect(primitives.genus).toBe('Solanum');
    });

    it('should omit genus from toPrimitives when not derivable', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: '×Brassicoraphanus' })
      );
      expect(identity.toPrimitives()).not.toHaveProperty('genus');
    });

    it('should update genus when scientificName changes', () => {
      const identity = PlantIdentityBuilder.tomato();
      const updated = identity.update({ scientificName: 'ocimum basilicum' });
      expect(updated.genus).toBe('Ocimum');
    });

    it('should clear genus when scientificName changes to underivable', () => {
      const identity = PlantIdentityBuilder.tomato();
      const updated = identity.update({ scientificName: '×Brassicoraphanus' });
      expect(updated.genus).toBeUndefined();
    });
  });

  describe('slug generation', () => {
    it('should derive slug from scientific name', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: 'solanum lycopersicum' })
      );
      expect(identity.slug).toBe('solanum-lycopersicum');
    });

    it('should update slug when scientific name changes', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: 'solanum lycopersicum' })
      );
      const updated = identity.update({ scientificName: 'ocimum basilicum' });
      expect(updated.slug).toBe('ocimum-basilicum');
    });

    it('should keep slug when only the primary name changes', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: 'solanum lycopersicum' })
      );
      const updated = identity.update({ name: { primary: 'Cherry Tomato' } });
      expect(updated.slug).toBe('solanum-lycopersicum');
    });

    it('should strip a hybrid prefix when slugifying the scientific name', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: '×Brassicoraphanus' })
      );
      expect(identity.slug).toBe('brassicoraphanus');
    });

    it('should expose slug as a property but keep it out of identity primitives', () => {
      const identity = new PlantIdentity(
        tomato({ scientificName: 'solanum lycopersicum' })
      );
      expect(identity.slug).toBe('solanum-lycopersicum');
      expect(identity.toPrimitives()).not.toHaveProperty('slug');
    });
  });
});
