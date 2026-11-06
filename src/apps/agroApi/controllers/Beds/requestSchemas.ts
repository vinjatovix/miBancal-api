import { z } from 'zod';

import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import {
  emptyBody,
  emptyQuery,
  requiredShortTextSchema
} from '../../shared/requestSchemas.js';

// Optional keys use `.exactOptional()` so the parsed body is assignable to the
// Bed DTOs under `exactOptionalPropertyTypes` without casts. The owner comes
// from the session and plant instances change through their own operations:
// neither is accepted here.

const bedIdParams = z.object({
  id: z.uuid()
});

/** A JSON number above zero; numeric strings, `Infinity` and `NaN` rejected. */
const dimensionSchema = z.number().positive();

const createBedBody = z.object({
  id: z.uuid(),
  name: requiredShortTextSchema,
  width: dimensionSchema,
  height: dimensionSchema,
  depth: dimensionSchema,
  locationId: z.uuid()
});

export const createBedRequest = {
  query: emptyQuery,
  body: createBedBody
} satisfies RequestSchemas;

const bedIncludeSchema = z
  .enum([
    'plantInstances',
    'location',
    'plantInstances,location',
    'location,plantInstances'
  ])
  .exactOptional();

const locationIdFilterValue = z.union([
  z.uuid(),
  z.object({
    eq: z.uuid()
  })
]);

const listBedsQuery = z
  .object({
    include: bedIncludeSchema,
    filter: z
      .object({
        locationId: locationIdFilterValue.exactOptional()
      })
      .strict()
      .exactOptional(),
    'filter[locationId]': z.uuid().exactOptional(),
    'filter[locationId][eq]': z.uuid().exactOptional()
  })
  .strict();

export const listBedsRequest = {
  query: listBedsQuery,
  body: emptyBody
} satisfies RequestSchemas;

const getBedByIdQuery = z
  .object({
    include: bedIncludeSchema
  })
  .strict();

export const getBedByIdRequest = {
  params: bedIdParams,
  query: getBedByIdQuery,
  body: emptyBody
} satisfies RequestSchemas;

const positionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0)
});
const nullablePositionSchema = z.union([positionSchema, z.null()]);
const rotationSchema = z.number().int().min(0).max(359);

// JSON Merge Patch: `{}` accepted (no-op), the version check still applies.
// Every field is required on the bed, so none accepts `null`.
const updateBedBody = z.object({
  name: requiredShortTextSchema.exactOptional(),
  width: dimensionSchema.exactOptional(),
  height: dimensionSchema.exactOptional(),
  depth: dimensionSchema.exactOptional(),
  // A uuid re-snapshots and relocates to that owned location.
  // Unlinking (null) is prohibited (400). Omitted leaves location unchanged.
  locationId: z.uuid().exactOptional(),
  position: nullablePositionSchema.exactOptional(),
  rotation: rotationSchema.exactOptional()
});

export const updateBedRequest = {
  params: bedIdParams,
  query: emptyQuery,
  body: updateBedBody
} satisfies RequestSchemas;

export const deleteBedRequest = {
  params: bedIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;
