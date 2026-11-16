import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import { fromMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import {
  toSparseView,
  type ReadViewFieldMappers
} from '../../../../shared/infrastructure/persistence/mongo/readViewFields.js';
import type {
  AnomalyField,
  AnomalyReadView,
  AnomalySparseView
} from '../../application/queries/AnomalyReadView.js';
import type { AnomalyStatus } from '../../domain/entities/types/AnomalyStatus.js';
import type { MongoAnomalyDocument } from './types/MongoAnomalyDocument.js';

/**
 * A stored anomaly as it may be found: legacy documents miss `version`, and
 * `deletedAt` may be read back as a `Date` or an ISO string.
 */
export type StoredAnomalyDocument = Omit<
  MongoAnomalyDocument,
  'version' | 'status' | 'deletedAt'
> & {
  version?: number;
  status: `${AnomalyStatus}`;
  deletedAt?: Date | string;
};

const toMetadata = (metadata: MetadataPrimitives): MetadataPrimitives => ({
  createdAt: new Date(metadata.createdAt),
  createdBy: metadata.createdBy,
  updatedAt: new Date(metadata.updatedAt),
  updatedBy: metadata.updatedBy
});

const toIsoDate = (value: Date | string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  return value instanceof Date ? value.toISOString() : value;
};

/** How each read-view field comes from a stored anomaly. */
const ANOMALY_VIEW_FIELDS: ReadViewFieldMappers<
  StoredAnomalyDocument,
  AnomalyReadView
> = {
  id: (document) => fromMongoId(document._id),
  slug: (document) => document.slug,
  name: (document) => document.name,
  scientificName: (document) => document.scientificName,
  category: (document) => document.category,
  description: (document) => document.description,
  symptoms: (document) => document.symptoms,
  damage: (document) => document.damage,
  causes: (document) => document.causes,
  affectedCrops: (document) => document.affectedCrops,
  prevention: (document) => document.prevention,
  treatment: (document) => document.treatment,
  naturalEnemies: (document) => document.naturalEnemies,
  resources: (document) => document.resources,
  confusedWith: (document) => document.confusedWith,
  status: (document) => document.status,
  deletedAt: (document) => toIsoDate(document.deletedAt),
  metadata: (document) => toMetadata(document.metadata),
  version: (document) => document.version ?? 0
};

/** Stored anomaly → read view; copies stored values, builds no aggregate. */
export const toAnomalyReadView = (
  document: StoredAnomalyDocument
): AnomalyReadView => {
  const optional = (
    key: Exclude<
      AnomalyField,
      'id' | 'slug' | 'name' | 'category' | 'status' | 'metadata' | 'version'
    >
  ): Partial<AnomalyReadView> => {
    const value = ANOMALY_VIEW_FIELDS[key](document);
    return value === undefined ? {} : { [key]: value };
  };

  return {
    id: ANOMALY_VIEW_FIELDS.id(document),
    slug: ANOMALY_VIEW_FIELDS.slug(document),
    name: ANOMALY_VIEW_FIELDS.name(document),
    category: ANOMALY_VIEW_FIELDS.category(document),
    ...optional('scientificName'),
    ...optional('description'),
    ...optional('symptoms'),
    ...optional('damage'),
    ...optional('causes'),
    ...optional('affectedCrops'),
    ...optional('prevention'),
    ...optional('treatment'),
    ...optional('naturalEnemies'),
    ...optional('resources'),
    ...optional('confusedWith'),
    status: ANOMALY_VIEW_FIELDS.status(document),
    ...optional('deletedAt'),
    metadata: ANOMALY_VIEW_FIELDS.metadata(document),
    version: ANOMALY_VIEW_FIELDS.version(document)
  };
};

/**
 * Stored anomaly read with a fieldset → `id` plus the selected fields; absent
 * optional fields stay absent.
 */
export const toAnomalySparseView = (
  document: StoredAnomalyDocument,
  fields: readonly AnomalyField[]
): AnomalySparseView => toSparseView(ANOMALY_VIEW_FIELDS, document, fields);
