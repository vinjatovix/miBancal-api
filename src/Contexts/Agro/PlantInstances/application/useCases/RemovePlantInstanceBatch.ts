import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import {
  DomainNotFoundException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import type { PlantInstancePrimitives } from '../../domain/entities/types/index.js';
import { createPlantInstanceId } from '../../domain/PlantInstanceId.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';

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
    const requestedIds = input.items.map((it) => createPlantInstanceId(it.id));
    const foundCrops = await this.plantInstanceRepository.findOwnedActiveByIds(
      requestedIds,
      user.id
    );

    if (foundCrops.length !== input.items.length) {
      const foundIds = new Set(foundCrops.map((c) => c.id));
      const missingId = requestedIds.find((id) => !foundIds.has(id))!;
      throw new DomainNotFoundException(
        `PlantInstance not found: ${missingId}`
      );
    }

    const bedIds = new Set(foundCrops.map((c) => c.bedId));
    if (bedIds.size !== 1) {
      throw new InvalidArgumentException(
        'All items in batch must belong to the same bed'
      );
    }

    const bedId = foundCrops[0]!.bedId;
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(bedId, user.id),
      'Bed',
      bedId
    );

    const cropsMap = new Map(foundCrops.map((c) => [c.id, c]));
    for (const item of input.items) {
      const crop = cropsMap.get(createPlantInstanceId(item.id))!;
      ensureVersion(crop.version, [item.version], 'PlantInstance', item.id);
    }

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
      for (const { current, updated } of diffs) {
        await this.plantInstanceRepository.updateWithDiff(current, updated);
      }
    });
  }
}
