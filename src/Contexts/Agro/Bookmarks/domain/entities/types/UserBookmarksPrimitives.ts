import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { FavoritePlantItemPrimitives } from '../../value-objects/types/FavoritePlantItemPrimitives.js';

export type UserBookmarksPrimitives = {
  id: string;
  userId: string;
  plants: FavoritePlantItemPrimitives[];
  metadata: MetadataPrimitives;
  version: number;
};
