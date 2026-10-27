import { Metadata } from '../../../shared/domain/valueObject/index.js';
import { GardenInput } from '../domain/entities/GardenInput.js';
import { createGardenInputId } from '../domain/GardenInputId.js';
import { definedGardenInputFields } from './gardenInputFields.js';
import type { GardenInputDomainMapper } from './interfaces/GardenInputDomainMapper.js';

export const gardenInputDomainMapper: GardenInputDomainMapper = {
  toPrimitives(gardenInput) {
    return {
      id: gardenInput.id,
      slug: gardenInput.slug,
      name: gardenInput.name,
      category: gardenInput.category,
      ...definedGardenInputFields(gardenInput),
      status: gardenInput.status,
      ...(gardenInput.deletedAt
        ? { deletedAt: gardenInput.deletedAt.toISOString() }
        : {}),
      metadata: gardenInput.metadata.toPrimitives(),
      version: gardenInput.version
    };
  },

  fromPrimitives(primitives) {
    return GardenInput.create({
      id: createGardenInputId(primitives.id),
      slug: primitives.slug,
      name: primitives.name,
      category: primitives.category,
      ...definedGardenInputFields(primitives),
      status: primitives.status,
      ...(primitives.deletedAt
        ? { deletedAt: new Date(primitives.deletedAt) }
        : {}),
      metadata: Metadata.fromPrimitives(primitives.metadata),
      version: primitives.version
    });
  }
};
