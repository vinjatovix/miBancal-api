import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { GardenInput } from '../domain/entities/GardenInput.js';
import { createGardenInputId } from '../domain/GardenInputId.js';
import type { MongoGardenInputDocument } from '../infrastructure/persistence/types/MongoGardenInputDocument.js';
import { definedGardenInputFields } from './gardenInputFields.js';
import type { GardenInputPersistenceMapper } from './interfaces/GardenInputPersistenceMapper.js';

export const gardenInputPersistenceMapper: GardenInputPersistenceMapper = {
  fromMongoDocument(document: MongoGardenInputDocument): GardenInput {
    return GardenInput.create({
      id: createGardenInputId(fromMongoId(document._id)),
      slug: document.slug,
      name: document.name,
      category: document.category,
      ...definedGardenInputFields(document),
      status: document.status,
      ...(document.deletedAt
        ? { deletedAt: new Date(document.deletedAt) }
        : {}),
      metadata: Metadata.fromPrimitives(document.metadata),
      version: document.version
    });
  },

  toMongoDocument(gardenInput: GardenInput): MongoGardenInputDocument {
    return {
      _id: toMongoId(gardenInput.id),
      slug: gardenInput.slug,
      name: gardenInput.name,
      category: gardenInput.category,
      ...definedGardenInputFields(gardenInput),
      status: gardenInput.status,
      ...(gardenInput.deletedAt ? { deletedAt: gardenInput.deletedAt } : {}),
      metadata: gardenInput.metadata.toPrimitives(),
      version: gardenInput.version
    };
  }
};
