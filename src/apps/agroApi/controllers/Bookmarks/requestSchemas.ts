import { z } from 'zod';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import { emptyBody, emptyQuery } from '../../shared/requestSchemas.js';

export const plantIdParamSchema = z.object({
  plantId: z.uuid()
});

export const addPlantBookmarkBodySchema = z.object({
  plantId: z.uuid()
});

export const getUserBookmarksQuerySchema = z.object({
  include: z.enum(['plant']).exactOptional()
});

export const addPlantBookmarkRequest = {
  query: emptyQuery,
  body: addPlantBookmarkBodySchema
} satisfies RequestSchemas;

export const removePlantBookmarkRequest = {
  params: plantIdParamSchema,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const checkPlantBookmarkRequest = {
  params: plantIdParamSchema,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const getUserBookmarksRequest = {
  query: getUserBookmarksQuerySchema,
  body: emptyBody
} satisfies RequestSchemas;

export type PlantIdParams = z.infer<typeof plantIdParamSchema>;
export type AddPlantBookmarkBody = z.infer<typeof addPlantBookmarkBodySchema>;
export type GetUserBookmarksQuery = z.infer<typeof getUserBookmarksQuerySchema>;
