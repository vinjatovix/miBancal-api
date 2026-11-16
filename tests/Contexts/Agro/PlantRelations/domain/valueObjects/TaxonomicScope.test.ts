import { TaxonomicScope } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';

const VALID_UUID = '0192e201-0000-7000-8000-000000000001';

describe('TaxonomicScope', () => {
  describe('plant factory', () => {
    it('creates plant scope with valid UUID', () => {
      const scope = TaxonomicScope.plant(VALID_UUID);

      expect(scope.scope).toBe('plant');
      expect(scope.value).toBe(VALID_UUID);
      expect(scope.isPlant()).toBe(true);
    });

    it.each([['not-a-uuid'], ['12345'], [''], ['   ']])(
      'throws InvalidArgumentException for invalid plant UUID %s',
      (invalidId) => {
        expect(() => TaxonomicScope.plant(invalidId)).toThrow(
          InvalidArgumentException
        );
      }
    );
  });

  describe('genus factory', () => {
    it.each([
      ['Solanum', 'Solanum'],
      ['Tagetes', 'Tagetes'],
      ['Foeniculum', 'Foeniculum'],
      ['Ocimum', 'Ocimum'],
      ['SOLANUM', 'Solanum'],
      ['Abcdefghijklmnopqrstuvwxyza', 'Abcdefghijklmnopqrstuvwxyza']
    ])(
      'creates genus scope with valid genus name %s',
      (genusName, expectedValue) => {
        const scope = TaxonomicScope.genus(genusName);

        expect(scope.scope).toBe('genus');
        expect(scope.value).toBe(expectedValue);
        expect(scope.isGenus()).toBe(true);
      }
    );

    it.each([
      ['solanum'],
      ['Solanum123'],
      ['Solanum_patula'],
      ['S'],
      [''],
      ['   '],
      ['A'.repeat(51)]
    ])(
      'throws InvalidArgumentException for invalid genus name %s',
      (invalidName) => {
        expect(() => TaxonomicScope.genus(invalidName)).toThrow(
          InvalidArgumentException
        );
      }
    );
  });

  describe('family factory', () => {
    it('creates family scope with valid UUID', () => {
      const scope = TaxonomicScope.family(VALID_UUID);

      expect(scope.scope).toBe('family');
      expect(scope.value).toBe(VALID_UUID);
      expect(scope.isFamily()).toBe(true);
    });

    it.each([['not-a-uuid'], ['invalid'], [''], ['   ']])(
      'throws InvalidArgumentException for invalid family UUID %s',
      (invalidId) => {
        expect(() => TaxonomicScope.family(invalidId)).toThrow(
          InvalidArgumentException
        );
      }
    );
  });

  describe('all factory', () => {
    it('creates broadcast scope with undefined value', () => {
      const scope = TaxonomicScope.all();

      expect(scope.scope).toBe('all');
      expect(scope.value).toBeUndefined();
      expect(scope.isAll()).toBe(true);
    });
  });

  describe('fromPrimitives', () => {
    it.each([
      [{ scope: 'plant' as const, value: VALID_UUID }, 'plant', VALID_UUID],
      [{ scope: 'genus' as const, value: 'Solanum' }, 'genus', 'Solanum'],
      [{ scope: 'family' as const, value: VALID_UUID }, 'family', VALID_UUID],
      [{ scope: 'all' as const }, 'all', undefined]
    ])(
      'reconstructs scope from valid primitives %s',
      (primitives, expectedScope, expectedValue) => {
        const scope = TaxonomicScope.fromPrimitives(primitives);

        expect(scope.scope).toBe(expectedScope);
        expect(scope.value).toBe(expectedValue);
      }
    );

    it('throws InvalidArgumentException when scope is all and value is defined', () => {
      expect(() =>
        TaxonomicScope.fromPrimitives({ scope: 'all', value: 'forbidden' })
      ).toThrow(InvalidArgumentException);
    });

    it('throws InvalidArgumentException for unknown scope type', () => {
      expect(() =>
        TaxonomicScope.fromPrimitives({
          scope: 'order' as unknown as 'plant',
          value: VALID_UUID
        })
      ).toThrow(InvalidArgumentException);
    });
  });

  describe('equals', () => {
    it('returns true for identical scopes', () => {
      const scopeA = TaxonomicScope.genus('Solanum');
      const scopeB = TaxonomicScope.genus('Solanum');

      const result = scopeA.equals(scopeB);

      expect(result).toBe(true);
    });

    it('returns false for different values within same scope', () => {
      const scopeA = TaxonomicScope.genus('Solanum');
      const scopeB = TaxonomicScope.genus('Tagetes');

      const result = scopeA.equals(scopeB);

      expect(result).toBe(false);
    });

    it('returns false for different scopes', () => {
      const scopeA = TaxonomicScope.plant(VALID_UUID);
      const scopeB = TaxonomicScope.family(VALID_UUID);

      const result = scopeA.equals(scopeB);

      expect(result).toBe(false);
    });

    it('returns true for both all scopes', () => {
      const scopeA = TaxonomicScope.all();
      const scopeB = TaxonomicScope.all();

      const result = scopeA.equals(scopeB);

      expect(result).toBe(true);
    });
  });

  describe('toPrimitives', () => {
    it('serializes scoped object with value', () => {
      const scope = TaxonomicScope.plant(VALID_UUID);

      const primitives = scope.toPrimitives();

      expect(primitives).toEqual({ scope: 'plant', value: VALID_UUID });
    });

    it('serializes broadcast scope without value', () => {
      const scope = TaxonomicScope.all();

      const primitives = scope.toPrimitives();

      expect(primitives).toEqual({ scope: 'all' });
    });
  });
});
