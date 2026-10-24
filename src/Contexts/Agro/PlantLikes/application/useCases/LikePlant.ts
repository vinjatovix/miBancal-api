import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { DomainNotFoundException } from '../../../../shared/domain/errors/index.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import type { PlantLikesCounterRepository } from '../../../Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import { PlantLike } from '../../domain/entities/PlantLike.js';
import { randomPlantLikeId } from '../../domain/PlantLikeId.js';
import type { PlantLikeRepository } from '../../domain/repositories/interfaces/PlantLikeRepository.js';
import type { LikePlantResult } from '../dtos/index.js';

export type LikePlantInput = {
  plantId: string;
};

export type LikePlantDependencies = {
  plantRepository: PlantRepository;
  plantLikeRepository: PlantLikeRepository;
  plantLikesCounterRepository: PlantLikesCounterRepository;
  unitOfWork: UnitOfWork;
};

export class LikePlant {
  private readonly plantRepository: PlantRepository;
  private readonly plantLikeRepository: PlantLikeRepository;
  private readonly plantLikesCounterRepository: PlantLikesCounterRepository;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    plantRepository,
    plantLikeRepository,
    plantLikesCounterRepository,
    unitOfWork
  }: LikePlantDependencies) {
    this.plantRepository = plantRepository;
    this.plantLikeRepository = plantLikeRepository;
    this.plantLikesCounterRepository = plantLikesCounterRepository;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    dto: LikePlantInput,
    user: UserSessionInfo
  ): Promise<LikePlantResult> {
    const plant = await this.plantRepository.findActiveById(dto.plantId);
    if (!plant) {
      throw new DomainNotFoundException(`Plant not found: ${dto.plantId}`);
    }

    const userId = createUserId(user.id);
    const plantId = createPlantId(dto.plantId);

    // The interaction insert and the counter `$inc` commit together: a new
    // like increments exactly once; a repeat like skips the counter entirely.
    return this.unitOfWork.run(async () => {
      const like = PlantLike.create(randomPlantLikeId(), userId, plantId);
      const created = await this.plantLikeRepository.add(like);

      if (created) {
        await this.plantLikesCounterRepository.increment(dto.plantId);

        return {
          item: { plantId: dto.plantId, likedAt: like.toPrimitives().likedAt },
          status: 201
        };
      }

      const existing = await this.plantLikeRepository.find(
        user.id,
        dto.plantId
      );
      if (!existing) {
        throw new DomainNotFoundException(
          `Plant like not found: ${dto.plantId}`
        );
      }

      return {
        item: { plantId: dto.plantId, likedAt: existing.likedAt.toISOString() },
        status: 200
      };
    });
  }
}
