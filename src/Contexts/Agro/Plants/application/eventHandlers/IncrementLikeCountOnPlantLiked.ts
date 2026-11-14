import { PlantLiked } from '../../../PlantLikes/domain/events/index.js';
import type { PlantLikesCounterRepository } from '../../domain/repositories/interfaces/PlantLikesCounterRepository.js';

export type IncrementLikeCountOnPlantLikedDependencies = {
  plantLikesCounterRepository: PlantLikesCounterRepository;
};

export class IncrementLikeCountOnPlantLiked {
  private readonly plantLikesCounterRepository: PlantLikesCounterRepository;

  constructor({
    plantLikesCounterRepository
  }: IncrementLikeCountOnPlantLikedDependencies) {
    this.plantLikesCounterRepository = plantLikesCounterRepository;
  }

  async handle(event: PlantLiked): Promise<void> {
    await this.plantLikesCounterRepository.increment(event.payload.plantId);
  }
}
