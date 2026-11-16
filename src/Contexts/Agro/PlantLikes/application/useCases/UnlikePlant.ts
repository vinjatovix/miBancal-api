import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import type { EventBus } from '../../../../shared/application/eventBus/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { DomainNotFoundException } from '../../../../shared/domain/errors/index.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import { PlantUnliked } from '../../domain/events/index.js';
import type { PlantLikeRepository } from '../../domain/repositories/interfaces/PlantLikeRepository.js';

export type UnlikePlantDependencies = {
  plantRepository: PlantRepository;
  plantLikeRepository: PlantLikeRepository;
  eventBus: EventBus;
  unitOfWork: UnitOfWork;
};

export class UnlikePlant {
  private readonly plantRepository: PlantRepository;
  private readonly plantLikeRepository: PlantLikeRepository;
  private readonly eventBus: EventBus;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    plantRepository,
    plantLikeRepository,
    eventBus,
    unitOfWork
  }: UnlikePlantDependencies) {
    this.plantRepository = plantRepository;
    this.plantLikeRepository = plantLikeRepository;
    this.eventBus = eventBus;
    this.unitOfWork = unitOfWork;
  }

  async execute(plantIdString: string, user: UserSessionInfo): Promise<void> {
    const plant = await this.plantRepository.findActiveById(plantIdString);
    if (!plant) {
      throw new DomainNotFoundException(`Plant not found: ${plantIdString}`);
    }

    await this.unitOfWork.run(async () => {
      const removed = await this.plantLikeRepository.remove(
        user.id,
        plantIdString
      );

      if (removed) {
        await this.eventBus.publish([
          new PlantUnliked(plantIdString, {
            plantId: plantIdString,
            userId: user.id
          })
        ]);
      }
    });
  }
}
