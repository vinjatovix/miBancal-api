import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import type { PlantInstancePrimitives } from '../../domain/entities/types/index.js';
import { createPlantInstanceId } from '../../domain/PlantInstanceId.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import { validatePlantInstanceBatch } from './validatePlantInstanceBatch.js';

export type RemovePlantInstanceBatchItemInput = {
  id: string;
  version: number;
};

export type RemovePlantInstanceBatchInput = {
  items: RemovePlantInstanceBatchItemInput[];
};

export type RemovePlantInstanceBatchDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
  unitOfWork: UnitOfWork;
};

export class RemovePlantInstanceBatch {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    bedRepository,
    plantInstanceRepository,
    unitOfWork
  }: RemovePlantInstanceBatchDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    input: RemovePlantInstanceBatchInput,
    user: UserSessionInfo
  ): Promise<void> {
    const { bed, cropsMap } = await validatePlantInstanceBatch({
      items: input.items,
      userId: user.id,
      plantInstanceRepository: this.plantInstanceRepository,
      bedRepository: this.bedRepository
    });

    const at = new Date();
    const diffs: Array<{
      current: PlantInstancePrimitives;
      updated: PlantInstancePrimitives;
    }> = [];

    for (const item of input.items) {
      const crop = cropsMap.get(createPlantInstanceId(item.id))!;
      const currentPrimitives = crop.toPrimitives();
      crop.markAsRemoved(user.username, at);
      const updatedPrimitives = crop.toPrimitives();
      diffs.push({ current: currentPrimitives, updated: updatedPrimitives });
    }

    await this.unitOfWork.run(async () => {
      await this.bedRepository.conditionalIncrementVersion(bed.id, bed.version);
      // NOSONAR: MongoDB client sessions cannot execute concurrent operations within a transaction
      for (const { current, updated } of diffs) {
        await this.plantInstanceRepository.updateWithDiff(current, updated);
      }
    });
  }
}
