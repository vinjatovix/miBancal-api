import { z } from 'zod';

import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import { listQuerySchema } from '../../shared/listQuerySchema.js';
import {
  emptyBody,
  requiredShortTextSchema
} from '../../shared/requestSchemas.js';

const locationIdParams = z.object({
  id: z.uuid()
});

const latitudeSchema = z.number().finite().min(-90).max(90);
const longitudeSchema = z.number().finite().min(-180).max(180);

const createLocationBody = z
  .object({
    id: z.uuid(),
    name: requiredShortTextSchema,
    latitude: latitudeSchema,
    longitude: longitudeSchema
  })
  .strict();

export const createLocationRequest = {
  body: createLocationBody
} satisfies RequestSchemas;

// JSON Merge Patch: `{}` accepted (no-op). If coordinates are updated,
// both latitude and longitude must be provided together.
const updateLocationBody = z
  .object({
    name: requiredShortTextSchema.exactOptional(),
    latitude: latitudeSchema.exactOptional(),
    longitude: longitudeSchema.exactOptional()
  })
  .strict()
  .refine(
    (data) =>
      (data.latitude === undefined && data.longitude === undefined) ||
      (data.latitude !== undefined && data.longitude !== undefined),
    {
      message: 'Both latitude and longitude must be provided together'
    }
  );

export const updateLocationRequest = {
  params: locationIdParams,
  body: updateLocationBody
} satisfies RequestSchemas;

export const getLocationByIdRequest = {
  params: locationIdParams,
  body: emptyBody
} satisfies RequestSchemas;

export const deleteLocationRequest = {
  params: locationIdParams,
  body: emptyBody
} satisfies RequestSchemas;

const listLocationsQuery = listQuerySchema({
  filter: {},
  sortableKeys: ['name', 'createdAt']
});

export const listLocationsRequest = {
  query: listLocationsQuery,
  body: emptyBody
} satisfies RequestSchemas;
