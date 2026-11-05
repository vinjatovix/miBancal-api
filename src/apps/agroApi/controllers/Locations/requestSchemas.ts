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
const nullableLatitudeSchema = z.union([latitudeSchema, z.null()]);
const nullableLongitudeSchema = z.union([longitudeSchema, z.null()]);

const createLocationBody = z
  .object({
    id: z.uuid(),
    name: requiredShortTextSchema,
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

export const createLocationRequest = {
  body: createLocationBody
} satisfies RequestSchemas;

// JSON Merge Patch: `{}` accepted (no-op). If coordinates are updated,
// both latitude and longitude must be provided together. Both can be null to clear.
const updateLocationBody = z
  .object({
    name: requiredShortTextSchema.exactOptional(),
    latitude: nullableLatitudeSchema.exactOptional(),
    longitude: nullableLongitudeSchema.exactOptional()
  })
  .strict()
  .refine(
    (data) => {
      const hasLat = data.latitude !== undefined;
      const hasLng = data.longitude !== undefined;
      if (!hasLat && !hasLng) return true;
      if (!hasLat || !hasLng) return false;
      const bothNull = data.latitude === null && data.longitude === null;
      const bothNumbers =
        typeof data.latitude === 'number' && typeof data.longitude === 'number';
      return bothNull || bothNumbers;
    },
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
