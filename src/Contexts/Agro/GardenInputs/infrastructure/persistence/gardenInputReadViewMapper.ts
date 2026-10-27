import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import { fromMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import {
  toSparseView,
  type ReadViewFieldMappers
} from '../../../../shared/infrastructure/persistence/mongo/readViewFields.js';
import type {
  GardenInputField,
  GardenInputReadView,
  GardenInputSparseView
} from '../../application/queries/GardenInputReadView.js';
import type { MongoGardenInputDocument } from './types/MongoGardenInputDocument.js';

export type StoredGardenInputDocument = Omit<
  MongoGardenInputDocument,
  'version' | 'status' | 'deletedAt'
> & {
  version?: number;
  status: 'active' | 'deleted';
  deletedAt?: Date | string | null;
};

const toMetadata = (metadata: MetadataPrimitives): MetadataPrimitives => ({
  createdAt: new Date(metadata.createdAt),
  createdBy: metadata.createdBy,
  updatedAt: new Date(metadata.updatedAt),
  updatedBy: metadata.updatedBy
});

const toIsoDate = (
  value: Date | string | null | undefined
): string | undefined => {
  if (value === undefined || value === null) return undefined;
  return value instanceof Date ? value.toISOString() : value;
};

const GARDEN_INPUT_VIEW_FIELDS: ReadViewFieldMappers<
  StoredGardenInputDocument,
  GardenInputReadView
> = {
  id: (document) => fromMongoId(document._id),
  slug: (document) => document.slug,
  name: (document) => document.name,
  description: (document) => document.description,
  category: (document) => document.category,
  actions: (document) => document.actions,
  activeIngredients: (document) => document.activeIngredients,
  nutrients: (document) => document.nutrients,
  targets: (document) => document.targets,
  recipes: (document) => document.recipes,
  resources: (document) => document.resources,
  status: (document) => document.status,
  deletedAt: (document) => toIsoDate(document.deletedAt),
  metadata: (document) => toMetadata(document.metadata),
  version: (document) => document.version ?? 0
};

export const toGardenInputReadView = (
  document: StoredGardenInputDocument
): GardenInputReadView => {
  const optional = (
    key: Exclude<
      GardenInputField,
      'id' | 'slug' | 'name' | 'category' | 'status' | 'metadata' | 'version'
    >
  ): Partial<GardenInputReadView> => {
    const value = GARDEN_INPUT_VIEW_FIELDS[key](document);
    return value === undefined ? {} : { [key]: value };
  };

  return {
    id: GARDEN_INPUT_VIEW_FIELDS.id(document),
    slug: GARDEN_INPUT_VIEW_FIELDS.slug(document),
    name: GARDEN_INPUT_VIEW_FIELDS.name(document),
    category: GARDEN_INPUT_VIEW_FIELDS.category(document),
    ...optional('description'),
    ...optional('actions'),
    ...optional('activeIngredients'),
    ...optional('nutrients'),
    ...optional('targets'),
    ...optional('recipes'),
    ...optional('resources'),
    status: GARDEN_INPUT_VIEW_FIELDS.status(document),
    ...optional('deletedAt'),
    metadata: GARDEN_INPUT_VIEW_FIELDS.metadata(document),
    version: GARDEN_INPUT_VIEW_FIELDS.version(document)
  };
};

export const toGardenInputSparseView = (
  document: StoredGardenInputDocument,
  fields: readonly GardenInputField[]
): GardenInputSparseView =>
  toSparseView(GARDEN_INPUT_VIEW_FIELDS, document, fields);
