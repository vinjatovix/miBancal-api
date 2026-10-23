import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { DomainNotFoundException } from '../../../../shared/domain/errors/index.js';
import type { PlantLikesCounterRepository } from '../../../Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { PlantLikeRepository } from '../../domain/repositories/interfaces/PlantLikeRepository.js';

export type UnlikePlantDependencies = {
  plantRepository: PlantRepository;
  plantLikeRepository: PlantLikeRepository;
  plantLikesCounterRepository: PlantLikesCounterRepository;
  unitOfWork: UnitOfWork;
};

export class UnlikePlant {
  private readonly plantRepository: PlantRepository;
  private readonly plantLikeRepository: PlantLikeRepository;
  private readonly plantLikesCounterRepository: PlantLikesCounterRepository;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    plantRepository,
    plantLikeRepository,
    plantLikesCounterRepository,
    unitOfWork
  }: UnlikePlantDependencies) {
    this.plantRepository = plantRepository;
    this.plantLikeRepository = plantLikeRepository;
    this.plantLikesCounterRepository = plantLikesCounterRepository;
    this.unitOfWork = unitOfWork;
  }

  async execute(plantIdString: string, user: UserSessionInfo): Promise<void> {
    const plant = await this.plantRepository.findActiveById(plantIdString);
    if (!plant) {
      throw new DomainNotFoundException(`Plant not found: ${plantIdString}`);
    }

    // The removal and the counter decrement commit together; the counter is
    // decremented only when a like was actually removed, so repeated unlikes
    // never drive it below zero (idempotent).
    await this.unitOfWork.run(async () => {
      const removed = await this.plantLikeRepository.remove(
        user.id,
        plantIdString
      );

      if (removed) {
        await this.plantLikesCounterRepository.decrement(plantIdString);
      }
    });
  }
}
