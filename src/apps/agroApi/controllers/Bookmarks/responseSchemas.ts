import { z } from 'zod';
import { familySummarySchema } from '../Plants/responseSchemas.js';

export const favoritePlantItemResponseSchema = z.object({
  plantId: z.uuid(),
  bookmarkedAt: z.iso.datetime()
});

export const enrichedPlantSummaryResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  scientificName: z.string(),
  primaryImage: z
    .object({
      url: z.string(),
      title: z.string(),
      source: z.string()
    })
    .nullable(),
  family: familySummarySchema
});

export const enrichedFavoritePlantItemResponseSchema =
  favoritePlantItemResponseSchema.extend({
    plant: enrichedPlantSummaryResponseSchema
  });

export const userBookmarksResponseSchema = z.object({
  plants: z.array(
    z.union([
      favoritePlantItemResponseSchema,
      enrichedFavoritePlantItemResponseSchema
    ])
  )
});

export const checkPlantBookmarkResponseSchema = z.object({
  bookmarked: z.boolean(),
  bookmarkedAt: z.iso.datetime().exactOptional()
});

export type FavoritePlantItemResponse = z.output<
  typeof favoritePlantItemResponseSchema
>;
export type EnrichedPlantSummaryResponse = z.output<
  typeof enrichedPlantSummaryResponseSchema
>;
export type EnrichedFavoritePlantItemResponse = z.output<
  typeof enrichedFavoritePlantItemResponseSchema
>;
export type UserBookmarksApiResponse = z.output<
  typeof userBookmarksResponseSchema
>;
export type CheckPlantBookmarkApiResponse = z.output<
  typeof checkPlantBookmarkResponseSchema
>;
