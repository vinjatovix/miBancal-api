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

const angleSchema = z.number().int().min(0).max(359);
const nullableAngleSchema = z.union([angleSchema, z.null()]);

const createLocationBody = z
  .object({
    id: z.uuid(),
    name: requiredShortTextSchema,
    latitude: latitudeSchema.exactOptional(),
    longitude: longitudeSchema.exactOptional(),
    northAngle: angleSchema.exactOptional()
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
    longitude: nullableLongitudeSchema.exactOptional(),
    northAngle: nullableAngleSchema.exactOptional()
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

const getLocationByIdQuery = z.object({
  include: z.enum(['beds']).optional()
});

export const getLocationByIdRequest = {
  params: locationIdParams,
  query: getLocationByIdQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const getLocationLayoutRequest = {
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

const bedPositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite()
});

const bedLayoutPlacementItemSchema = z.object({
  id: z.uuid(),
  position: z.union([bedPositionSchema, z.null()]),
  rotation: z.number().int().min(0).max(359).optional()
});

const updateLocationBedsLayoutBody = z
  .array(bedLayoutPlacementItemSchema)
  .min(1)
  .refine(
    (items) => {
      const ids = new Set(items.map((item) => item.id));
      return ids.size === items.length;
    },
    { message: 'Bed layout items must have unique IDs' }
  );

export const updateLocationBedsLayoutRequest = {
  params: locationIdParams,
  body: updateLocationBedsLayoutBody
} satisfies RequestSchemas;
