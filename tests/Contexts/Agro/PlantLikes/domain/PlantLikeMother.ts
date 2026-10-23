import { PlantLike } from '../../../../../src/Contexts/Agro/PlantLikes/domain/entities/PlantLike.js';
import { randomPlantLikeId } from '../../../../../src/Contexts/Agro/PlantLikes/domain/PlantLikeId.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';

export class PlantLikeMother {
  static of(
    userIdValue: string,
    plantIdValue: string,
    likedAt: Date = new Date()
  ): PlantLike {
    return PlantLike.create(
      randomPlantLikeId(),
      createUserId(userIdValue),
      createPlantId(plantIdValue),
      likedAt
    );
  }
}
