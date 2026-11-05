import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { Serializable } from '../../../../shared/domain/interfaces/Serializable.js';
import { createPlantId, type PlantId } from '../../../Plants/domain/PlantId.js';
import type { FavoritePlantItemPrimitives } from './types/FavoritePlantItemPrimitives.js';

export class FavoritePlantItem implements Serializable<FavoritePlantItemPrimitives> {
  public readonly plantId: PlantId;
  public readonly bookmarkedAt: Date;

  constructor(plantId: PlantId, bookmarkedAt: Date) {
    if (!plantId) {
      throw new InvalidArgumentException(
        'PlantId is required for FavoritePlantItem'
      );
    }

    if (
      !(bookmarkedAt instanceof Date) ||
      Number.isNaN(bookmarkedAt.getTime())
    ) {
      throw new InvalidArgumentException(
        'bookmarkedAt must be a valid Date object for FavoritePlantItem'
      );
    }

    this.plantId = plantId;
    this.bookmarkedAt = new Date(bookmarkedAt.getTime());
  }

  equals(other: FavoritePlantItem): boolean {
    return this.plantId === other.plantId;
  }

  toPrimitives(): FavoritePlantItemPrimitives {
    return {
      plantId: this.plantId,
      bookmarkedAt: this.bookmarkedAt.toISOString()
    };
  }

  static fromPrimitives(p: FavoritePlantItemPrimitives): FavoritePlantItem {
    return new FavoritePlantItem(
      createPlantId(p.plantId),
      new Date(p.bookmarkedAt)
    );
  }
}
