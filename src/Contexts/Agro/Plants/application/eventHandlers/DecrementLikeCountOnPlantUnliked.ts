import { PlantUnliked } from '../../../PlantLikes/domain/events/index.js';
import type { PlantLikesCounterRepository } from '../../domain/repositories/interfaces/PlantLikesCounterRepository.js';

export type DecrementLikeCountOnPlantUnlikedDependencies = {
  plantLikesCounterRepository: PlantLikesCounterRepository;
};

export class DecrementLikeCountOnPlantUnliked {
  private readonly plantLikesCounterRepository: PlantLikesCounterRepository;

  constructor({
    plantLikesCounterRepository
  }: DecrementLikeCountOnPlantUnlikedDependencies) {
    this.plantLikesCounterRepository = plantLikesCounterRepository;
  }

  async handle(event: PlantUnliked): Promise<void> {
    await this.plantLikesCounterRepository.decrement(event.payload.plantId);
  }
}
