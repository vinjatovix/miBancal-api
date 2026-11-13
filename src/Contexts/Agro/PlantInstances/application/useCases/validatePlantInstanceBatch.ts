import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import {
  DomainNotFoundException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { Bed } from '../../../Beds/domain/entities/Bed.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import {
  createPlantInstanceId,
  type PlantInstanceId
} from '../../domain/PlantInstanceId.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';

export type ValidateBatchParams = {
  items: ReadonlyArray<{ id: string; version: number }>;
  userId: string;
  plantInstanceRepository: PlantInstanceRepository;
  bedRepository: BedRepository;
};

export type ValidatedBatchResult = {
  bed: Bed;
  foundCrops: PlantInstance[];
  cropsMap: Map<PlantInstanceId, PlantInstance>;
};

export async function validatePlantInstanceBatch({
  items,
  userId,
  plantInstanceRepository,
  bedRepository
}: ValidateBatchParams): Promise<ValidatedBatchResult> {
  const requestedIds = items.map((it) => createPlantInstanceId(it.id));
  const uniqueIds = new Set(requestedIds);
  if (uniqueIds.size !== items.length) {
    throw new InvalidArgumentException('Batch items must have unique ids');
  }

  const foundCrops = await plantInstanceRepository.findOwnedActiveByIds(
    requestedIds,
    userId
  );

  if (foundCrops.length !== items.length) {
    const foundIds = new Set(foundCrops.map((c) => c.id));
    const missingId = requestedIds.find((id) => !foundIds.has(id))!;
    throw new DomainNotFoundException(`PlantInstance not found: ${missingId}`);
  }

  const bedIds = new Set(foundCrops.map((c) => c.bedId));
  if (bedIds.size !== 1) {
    throw new InvalidArgumentException(
      'All items in batch must belong to the same bed'
    );
  }

  const bedId = foundCrops[0]!.bedId;
  const bed = ensureFound(
    await bedRepository.findOwnedActiveById(bedId, userId),
    'Bed',
    bedId
  );

  const cropsMap = new Map(foundCrops.map((c) => [c.id, c]));
  for (const item of items) {
    const crop = cropsMap.get(createPlantInstanceId(item.id))!;
    ensureVersion(crop.version, [item.version], 'PlantInstance', item.id);
  }

  return {
    bed,
    foundCrops,
    cropsMap
  };
}
