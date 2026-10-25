import { z } from 'zod';

import type { AnomalyField } from '../../../../Contexts/Agro/Anomalies/application/queries/index.js';
import { ANOMALY_CATEGORIES } from '../../../../Contexts/Agro/Anomalies/domain/entities/types/index.js';
import { SUPPORT_RESOURCE_TYPES } from '../../../../Contexts/Agro/shared/domain/supportResource/index.js';
import {
  listSchema,
  longTextSchema,
  REQUEST_LIMITS,
  shortTextSchema
} from '../../shared/requestSchemas.js';
import {
  fieldsetMask,
  metadataResponseSchema,
  requiredLongTextResponseSchema,
  requiredShortTextResponseSchema
} from '../../shared/responseSchemas.js';

// Output check of the anomaly read path: mirrors the OpenAPI `Anomaly` schema.
// `z.object` strips unknown keys at any depth; a missing or mistyped contract
// field fails. Nothing here transforms a value (no trimming).

const textListSchema = listSchema(longTextSchema);

/** Absolute `http(s)` URL of a support resource. */
const resourceUrlSchema = z
  .string()
  .max(REQUEST_LIMITS.url)
  .regex(/^https?:\/\//);

/** The shared support-resource shape as returned (image not required here). */
const supportResourceResponseSchema = z.object({
  type: z.enum(SUPPORT_RESOURCE_TYPES),
  url: resourceUrlSchema,
  title: shortTextSchema.exactOptional(),
  source: shortTextSchema.exactOptional(),
  tags: listSchema(shortTextSchema).exactOptional()
});

/** A kebab-case anomaly slug (differential-diagnosis pointer). */
const slugResponseSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const anomalyResponseSchema = z.object({
  // Stored ids are short texts, not always UUIDs.
  id: z.string().min(1).max(REQUEST_LIMITS.shortText),
  version: z.number().int().min(0),
  slug: requiredShortTextResponseSchema,
  name: requiredShortTextResponseSchema,
  scientificName: requiredShortTextResponseSchema.exactOptional(),
  category: z.enum(ANOMALY_CATEGORIES),
  description: requiredLongTextResponseSchema.exactOptional(),
  symptoms: textListSchema.exactOptional(),
  damage: textListSchema.exactOptional(),
  causes: textListSchema.exactOptional(),
  affectedCrops: textListSchema.exactOptional(),
  prevention: textListSchema.exactOptional(),
  treatment: textListSchema.exactOptional(),
  naturalEnemies: textListSchema.exactOptional(),
  resources: listSchema(supportResourceResponseSchema).exactOptional(),
  confusedWith: listSchema(slugResponseSchema).exactOptional(),
  status: z.enum(['ACTIVE', 'DELETED']),
  deletedAt: z.iso.datetime().exactOptional(),
  metadata: metadataResponseSchema
});

export type AnomalyResponse = z.output<typeof anomalyResponseSchema>;

/** An anomaly read with `fields[anomalies]`: `id` plus any requested fields. */
export type AnomalyFieldsetResponse = Pick<AnomalyResponse, 'id'> &
  Partial<Omit<AnomalyResponse, 'id'>>;

/**
 * Output check of an anomaly read: the full schema without a fieldset, or only
 * `id` and the requested fields, each with its full contract shape.
 */
export const anomalyFieldsetResponseSchema = (
  fields?: readonly AnomalyField[]
): z.ZodType<AnomalyFieldsetResponse> =>
  fields === undefined
    ? anomalyResponseSchema
    : anomalyResponseSchema.pick(fieldsetMask(fields));
