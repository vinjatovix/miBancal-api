import { z } from 'zod';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import { emptyBody, emptyQuery } from '../../shared/requestSchemas.js';

export const plantIdParamSchema = z.object({
  plantId: z.uuid()
});

export const likePlantRequest = {
  params: plantIdParamSchema,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const unlikePlantRequest = {
  params: plantIdParamSchema,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const checkPlantLikeRequest = {
  params: plantIdParamSchema,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export type PlantLikeParams = z.infer<typeof plantIdParamSchema>;
