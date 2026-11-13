import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import type { PlantLikeRepository } from '../../domain/repositories/interfaces/PlantLikeRepository.js';
import type { CheckPlantLikeResponse } from '../dtos/index.js';

export type CheckPlantLikeDependencies = {
  plantLikeRepository: PlantLikeRepository;
};

export class CheckPlantLike {
  private readonly plantLikeRepository: PlantLikeRepository;

  constructor({ plantLikeRepository }: CheckPlantLikeDependencies) {
    this.plantLikeRepository = plantLikeRepository;
  }

  async execute(
    plantIdString: string,
    user: UserSessionInfo
  ): Promise<CheckPlantLikeResponse> {
    const existing = await this.plantLikeRepository.find(
      user.id,
      plantIdString
    );

    if (!existing) {
      return { liked: false };
    }

    return { liked: true, likedAt: existing.likedAt.toISOString() };
  }
}
