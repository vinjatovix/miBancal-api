import { Metadata } from '../../../shared/domain/valueObject/index.js';
import { GardenInput } from '../domain/entities/GardenInput.js';
import type { GardenInputChanges } from '../domain/entities/types/GardenInputChanges.js';
import { createGardenInputId } from '../domain/GardenInputId.js';
import { definedGardenInputFields } from './gardenInputFields.js';
import type { GardenInputInputMapper } from './interfaces/GardenInputInputMapper.js';

const CHANGE_KEYS = [
  'name',
  'description',
  'category',
  'actions',
  'activeIngredients',
  'nutrients',
  'targets',
  'recipes',
  'resources'
] as const satisfies ReadonlyArray<keyof GardenInputChanges>;

export const gardenInputInputMapper: GardenInputInputMapper = {
  fromCreateDto(dto, user) {
    return GardenInput.create({
      id: createGardenInputId(dto.id),
      slug: dto.slug,
      name: dto.name,
      category: dto.category,
      ...definedGardenInputFields(dto),
      metadata: Metadata.create(user)
    });
  },

  toChanges(input): GardenInputChanges {
    const changes: Partial<GardenInputChanges> = {};

    for (const key of CHANGE_KEYS) {
      const value = input[key];
      if (value !== undefined)
        (changes as Record<string, unknown>)[key] = value;
    }

    return changes;
  }
};
