import { z } from 'zod';

import { isValidIanaTimezone } from '../../../../Contexts/Agro/Locations/domain/utils/timezoneValidation.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import { listQuerySchema } from '../../shared/listQuerySchema.js';
import {
  emptyBody,
  requiredShortTextSchema
} from '../../shared/requestSchemas.js';

const locationIdParams = z.object({
  id: z.uuid()
});

const postalCodeSchema = z.string().trim().min(1).max(20);
const countrySchema = z.string().trim().min(1).max(100);
const timezoneSchema = z.string().trim().refine(isValidIanaTimezone, {
  message: 'Invalid IANA timezone identifier'
});
const hemisphereSchema = z.enum(['north', 'south']);

const createLocationBody = z.object({
  id: z.uuid(),
  name: requiredShortTextSchema,
  postalCode: postalCodeSchema.exactOptional(),
  country: countrySchema.exactOptional(),
  timezone: timezoneSchema.exactOptional(),
  hemisphere: hemisphereSchema.exactOptional()
});

export const createLocationRequest = {
  body: createLocationBody
} satisfies RequestSchemas;

// JSON Merge Patch: `{}` accepted (no-op); geographic fields accept `null`
// to unset. Name stays required-shaped (never `null`) when sent.
const updateLocationBody = z
  .object({
    name: requiredShortTextSchema.exactOptional(),
    postalCode: postalCodeSchema.nullable().exactOptional(),
    country: countrySchema.nullable().exactOptional(),
    timezone: timezoneSchema.nullable().exactOptional(),
    hemisphere: hemisphereSchema.nullable().exactOptional()
  })
  .strict();

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
