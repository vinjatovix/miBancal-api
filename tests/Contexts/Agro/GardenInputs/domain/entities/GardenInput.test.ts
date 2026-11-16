import { GardenInput } from '../../../../../../src/Contexts/Agro/GardenInputs/domain/entities/GardenInput.js';
import {
  GARDEN_INPUT_CATEGORIES,
  type GardenInputCategory
} from '../../../../../../src/Contexts/Agro/GardenInputs/domain/entities/types/index.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { SupportResourceBuilder } from '../../../shared/domain/supportResource/SupportResourceBuilder.js';
import { GardenInputMother } from '../mothers/GardenInputMother.js';

const USER = 'curator';

describe('GardenInput aggregate', () => {
  describe('create', () => {
    it('normalises and starts active at version 0', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());

      expect(input.status).toBe('active');
      expect(input.version).toBe(0);
      expect(input.isDeleted()).toBe(false);
      expect(input.deletedAt).toBeUndefined();
    });

    it.each([
      'Jabon-potasico',
      'jabon_potasico',
      'jabon--potasico',
      '-jabon',
      'jabon-'
    ])('rejects slug not matching strict kebab-case format (%s)', (slug) => {
      expect(() =>
        GardenInput.create(GardenInputMother.propsBase({ slug }))
      ).toThrow(InvalidArgumentException);
    });

    it('rejects slug with UUID format', () => {
      const uuidSlug = random.uuid();

      expect(() =>
        GardenInput.create(GardenInputMother.propsBase({ slug: uuidSlug }))
      ).toThrow(InvalidArgumentException);
    });

    it('trims name and rejects blank name', () => {
      expect(() =>
        GardenInput.create(GardenInputMother.propsBase({ name: '   ' }))
      ).toThrow(InvalidArgumentException);
    });

    it.each(GARDEN_INPUT_CATEGORIES)(
      'accepts valid category (%s)',
      (category: GardenInputCategory) => {
        const input = GardenInput.create(
          GardenInputMother.propsBase({ category })
        );

        expect(input.category).toBe(category);
      }
    );

    it('rejects invalid category', () => {
      expect(() =>
        GardenInput.create(
          GardenInputMother.propsBase({
            // @ts-expect-error invalid category testing
            category: 'chemical'
          })
        )
      ).toThrow(InvalidArgumentException);
    });

    it('rejects invalid action', () => {
      expect(() =>
        GardenInput.create(
          GardenInputMother.propsBase({
            // @ts-expect-error invalid action testing
            actions: ['invalid_action']
          })
        )
      ).toThrow(InvalidArgumentException);
    });

    it('drops duplicates from actions, activeIngredients, nutrients, targets', () => {
      const input = GardenInput.create(
        GardenInputMother.propsBase({
          actions: ['insecticide', 'repellent', 'insecticide'],
          activeIngredients: ['Azadiractina', 'azadiractina'],
          nutrients: ['N', 'n', 'P'],
          targets: ['Pulgón', 'pulgón', 'Trips']
        })
      );

      expect(input.actions).toEqual(['insecticide', 'repellent']);
      expect(input.activeIngredients).toEqual(['Azadiractina']);
      expect(input.nutrients).toEqual(['N', 'P']);
      expect(input.targets).toEqual(['Pulgón', 'Trips']);
    });

    it('stores empty optional arrays as absent', () => {
      const input = GardenInput.create(
        GardenInputMother.propsBase({
          actions: [],
          activeIngredients: [],
          nutrients: [],
          targets: [],
          recipes: [],
          resources: []
        })
      );

      expect(input.actions).toBeUndefined();
      expect(input.activeIngredients).toBeUndefined();
      expect(input.nutrients).toBeUndefined();
      expect(input.targets).toBeUndefined();
      expect(input.recipes).toBeUndefined();
      expect(input.resources).toBeUndefined();
    });

    it('validates recipe requires at least one ingredient and one instruction', () => {
      expect(() =>
        GardenInput.create(
          GardenInputMother.propsBase({
            recipes: [
              {
                name: 'Receta sin ingredientes',
                ingredients: [],
                instructions: ['Mezclar'],
                dosage: {
                  method: 'foliar',
                  dilution: '10%',
                  frequency: 'Semanal'
                }
              }
            ]
          })
        )
      ).toThrow(InvalidArgumentException);
    });
  });

  describe('updateDetails (merge-patch)', () => {
    it('replaces provided fields and keeps omitted ones', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());

      input.updateDetails(
        {
          name: 'Jabón potásico premium',
          description: 'Nueva fórmula concentrada.'
        },
        USER
      );

      expect(input.name).toBe('Jabón potásico premium');
      expect(input.description).toBe('Nueva fórmula concentrada.');
      expect(input.slug).toBe('jabon-potasico');
    });

    it('clears optional fields with null', () => {
      const input = GardenInput.create(
        GardenInputMother.propsBase({
          description: 'Descripción inicial',
          actions: ['insecticide'],
          resources: [SupportResourceBuilder.article()]
        })
      );

      input.updateDetails(
        {
          description: null,
          actions: null,
          resources: null
        },
        USER
      );

      expect(input.description).toBeUndefined();
      expect(input.actions).toBeUndefined();
      expect(input.resources).toBeUndefined();
    });

    it('atomically replaces recipes', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());
      const newRecipe = {
        name: 'Nueva receta de jabón',
        ingredients: [{ item: 'Jabón', quantity: '10 g' }],
        instructions: ['Disolver en agua tibia'],
        dosage: {
          method: 'irrigation' as const,
          dilution: '1%',
          frequency: 'Quincenal'
        }
      };

      input.updateDetails({ recipes: [newRecipe] }, USER);

      expect(input.recipes).toHaveLength(1);
      expect(input.recipes?.[0]?.name).toBe('Nueva receta de jabón');
      expect(input.recipes?.[0]?.dosage.method).toBe('irrigation');
    });

    it('is a no-op when nothing changes', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());
      const beforeMetadata = input.metadata.toPrimitives();

      input.updateDetails({}, USER, new Date(Date.now() + 1000));

      expect(input.metadata.toPrimitives()).toEqual(beforeMetadata);
    });

    it('cannot mutate a soft-deleted garden input', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());
      input.markAsDeleted(USER);

      expect(() => input.updateDetails({ name: 'Nuevo nombre' }, USER)).toThrow(
        DomainConflictException
      );
    });
  });

  describe('markAsDeleted', () => {
    it('sets status to deleted and records deletedAt', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());
      const at = new Date();

      input.markAsDeleted(USER, at);

      expect(input.status).toBe('deleted');
      expect(input.isDeleted()).toBe(true);
      expect(input.deletedAt).toEqual(at);
    });

    it('is idempotent on already deleted input', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());
      const at = new Date();
      input.markAsDeleted(USER, at);

      input.markAsDeleted(USER, new Date(at.getTime() + 5000));

      expect(input.deletedAt).toEqual(at);
    });
  });

  describe('syncVersion', () => {
    it('keeps current version when write outcome is unchanged', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());

      input.syncVersion('unchanged');

      expect(input.version).toBe(0);
    });

    it('increments version when write outcome is written', () => {
      const input = GardenInput.create(GardenInputMother.propsBase());

      input.syncVersion('written');

      expect(input.version).toBe(1);
    });
  });
});
