import { z } from 'zod';

import {
  ANOMALY_FIELDS,
  type AnomalyField
} from '../../../../Contexts/Agro/Anomalies/application/queries/index.js';
import type { AnomalyFilter } from '../../../../Contexts/Agro/Anomalies/domain/entities/types/AnomalyFilter.js';
import { ANOMALY_CATEGORIES } from '../../../../Contexts/Agro/Anomalies/domain/entities/types/index.js';
import type { QueryOptions } from '../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import {
  enumField,
  exactField,
  fieldsetSchema,
  listQuerySchema,
  readQuerySchema,
  textItem
} from '../../shared/listQuerySchema.js';
import {
  emptyBody,
  emptyQuery,
  listSchema,
  requiredLongTextSchema,
  requiredShortTextSchema,
  supportResourceSchema,
  trimmedLongTextSchema
} from '../../shared/requestSchemas.js';

// Required texts use the same schemas in create and update, so a PATCH cannot
// store what create rejects. Optional keys use `.exactOptional()` so the parsed
// body is assignable to the Anomaly DTOs under `exactOptionalPropertyTypes`.

/** Kebab-case, `1..120` (FR-002). Rejected at the transport boundary. */
const anomalySlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Expected a kebab-case slug'
  })
  // A UUID is valid kebab-case, but reads interpret a UUID-shaped key as an id
  // (`idOrSlug`), so a UUID-shaped slug would be unreachable by slug. Reserve
  // the shape at creation to keep the id/slug lookup unambiguous.
  .refine((value) => !z.uuid().safeParse(value).success, {
    message: 'A slug cannot have the shape of a UUID'
  });

const categorySchema = z.enum(ANOMALY_CATEGORIES);

/** List ≤ 50 of trimmed strings ≤ 2000. Blanks/dups dropped by the domain. */
const textListSchema = listSchema(trimmedLongTextSchema);

// PATCH: `.nullable()` marks the optional fields that `null` clears; required
// fields keep rejecting `null`.
const clearable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().exactOptional();

/** A UUID is looked up by id; anything else by slug. Trimmed, `1..200`. */
const anomalyIdOrSlugParams = z.object({
  idOrSlug: requiredShortTextSchema
});

const createAnomalyBody = z.object({
  id: z.uuid(),
  slug: anomalySlugSchema,
  name: requiredShortTextSchema,
  category: categorySchema,
  scientificName: requiredShortTextSchema.exactOptional(),
  description: requiredLongTextSchema.exactOptional(),
  symptoms: textListSchema.exactOptional(),
  damage: textListSchema.exactOptional(),
  causes: textListSchema.exactOptional(),
  affectedCrops: textListSchema.exactOptional(),
  prevention: textListSchema.exactOptional(),
  treatment: textListSchema.exactOptional(),
  naturalEnemies: textListSchema.exactOptional(),
  resources: listSchema(supportResourceSchema).exactOptional(),
  confusedWith: listSchema(anomalySlugSchema).exactOptional()
});

export const createAnomalyRequest = {
  query: emptyQuery,
  body: createAnomalyBody
} satisfies RequestSchemas;

// JSON Merge Patch: `{}` accepted (no-op), the version check still applies.
// `id`, `slug`, `version`, `status` and `metadata` are rejected (strict object).
// Optional texts and guidance lists accept `null` to clear them.
const updateAnomalyBody = z.object({
  name: requiredShortTextSchema.exactOptional(),
  category: categorySchema.exactOptional(),
  scientificName: clearable(requiredShortTextSchema),
  description: clearable(requiredLongTextSchema),
  symptoms: clearable(textListSchema),
  damage: clearable(textListSchema),
  causes: clearable(textListSchema),
  affectedCrops: clearable(textListSchema),
  prevention: clearable(textListSchema),
  treatment: clearable(textListSchema),
  naturalEnemies: clearable(textListSchema),
  resources: clearable(listSchema(supportResourceSchema)),
  confusedWith: clearable(listSchema(anomalySlugSchema))
});

export const updateAnomalyRequest = {
  params: anomalyIdOrSlugParams,
  query: emptyQuery,
  body: updateAnomalyBody
} satisfies RequestSchemas;

export const deleteAnomalyRequest = {
  params: anomalyIdOrSlugParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

// JSON:API `fields[anomalies]` on every anomaly read; anomalies have no
// relations to include.
const anomalySelection = {
  fields: fieldsetSchema('anomalies', ANOMALY_FIELDS)
};

export const getAnomalyByIdOrSlugRequest = {
  params: anomalyIdOrSlugParams,
  query: readQuerySchema(anomalySelection),
  body: emptyBody
} satisfies RequestSchemas;

// The output type is checked against what `ListAnomalies` takes.
const listAnomaliesQuery = listQuerySchema({
  filter: {
    slug: exactField(textItem),
    category: enumField(ANOMALY_CATEGORIES)
  },
  sortableKeys: ['name', 'slug'],
  ...anomalySelection
}) satisfies z.ZodType<
  Omit<QueryOptions<AnomalyFilter, AnomalyField>, 'include'>
>;

export const listAnomaliesRequest = {
  query: listAnomaliesQuery,
  body: emptyBody
} satisfies RequestSchemas;
