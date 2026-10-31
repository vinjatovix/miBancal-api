import type { FavoritePlantItemPrimitives } from '../../domain/value-objects/types/FavoritePlantItemPrimitives.js';
import type { EnrichedPlantSummary } from './EnrichedPlantSummary.js';

export type EnrichedFavoritePlantItem = FavoritePlantItemPrimitives & {
  plant: EnrichedPlantSummary;
};

export type BookmarkItemResponse =
  FavoritePlantItemPrimitives | EnrichedFavoritePlantItem;

export type UserBookmarksResponse = {
  plants: BookmarkItemResponse[];
};
