import { Coordinates } from '../../../../../shared/domain/value-objects/Coordinates.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import type { WriteOutcome } from '../../../../shared/domain/repositories/WriteOutcome.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { PlantInstance } from '../../domain/entities/PlantInstance.js';
import type {
  CropGrowthStatus,
  PlantInstancePrimitives
} from '../../domain/entities/types/index.js';
import { createPlantInstanceId } from '../../domain/PlantInstanceId.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import type { CropSpatialService } from '../../domain/services/CropSpatialService.js';
import { loadPlacedNeighbors } from './loadPlacedNeighbors.js';
import { validatePlantInstanceBatch } from './validatePlantInstanceBatch.js';

export type UpdatePlantInstanceBatchItemInput = {
  id: string;
  version: number;
  position?: { x: number; y: number } | undefined;
  growthStatus?: CropGrowthStatus | undefined;
  variety?: string | null | undefined;
  notes?: string | null | undefined;
};

export type UpdatePlantInstanceBatchInput = {
  items: UpdatePlantInstanceBatchItemInput[];
};

function resolveItemPosition(
  itemPosition?: { x: number; y: number },
  cropPosition?: { x: number; y: number }
): { x: number; y: number } | undefined {
  if (itemPosition !== undefined) {
    return itemPosition;
  }
  if (cropPosition !== undefined) {
    return { x: cropPosition.x, y: cropPosition.y };
  }
  return undefined;
}

export type UpdatePlantInstanceBatchDependencies = {
  bedRepository: BedRepository;
  plantRepository: PlantRepository;
  plantInstanceRepository: PlantInstanceRepository;
  cropSpatialService: CropSpatialService;
  unitOfWork: UnitOfWork;
};

export class UpdatePlantInstanceBatch {
  private readonly bedRepository: BedRepository;
  private readonly plantRepository: PlantRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly cropSpatialService: CropSpatialService;
  private readonly unitOfWork: UnitOfWork;

  constructor({
    bedRepository,
    plantRepository,
    plantInstanceRepository,
    cropSpatialService,
    unitOfWork
  }: UpdatePlantInstanceBatchDependencies) {
    this.bedRepository = bedRepository;
    this.plantRepository = plantRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.cropSpatialService = cropSpatialService;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    input: UpdatePlantInstanceBatchInput,
    user: UserSessionInfo
  ): Promise<PlantInstance[]> {
    const { bed, foundCrops, cropsMap } = await validatePlantInstanceBatch({
      items: input.items,
      userId: user.id,
      plantInstanceRepository: this.plantInstanceRepository,
      bedRepository: this.bedRepository
    });

    const uniquePlantIds = [...new Set(foundCrops.map((c) => c.plantId))].map(
      (id) => createPlantId(id)
    );
    const plants = await this.plantRepository.findByIds(uniquePlantIds);
    const plantRadiusMap = new Map(
      plants.map((p) => [p.id, p.traits.spacingCm.min / 2])
    );

    const batchSpatialItems = input.items.map((item, index) => {
      const crop = cropsMap.get(createPlantInstanceId(item.id))!;
      const position = resolveItemPosition(item.position, crop.position);

      return {
        itemIndex: index,
        id: crop.id,
        position,
        vitalRadiusCm: plantRadiusMap.get(createPlantId(crop.plantId)) ?? 0
      };
    });

    const hasPositionUpdates = input.items.some(
      (item) => item.position !== undefined
    );
    const hasPlacedCrops = batchSpatialItems.some(
      (it) => it.position !== undefined
    );

    if (hasPositionUpdates && hasPlacedCrops) {
      const allBedCrops = await loadPlacedNeighbors(
        this.plantInstanceRepository,
        this.plantRepository,
        { bedId: bed.id, userId: user.id }
      );

      this.cropSpatialService.validateBatchMovement({
        bed: {
          width: bed.width.value,
          height: bed.height.value
        },
        items: batchSpatialItems,
        existingCrops: allBedCrops,
        excludeCropIds: new Set(foundCrops.map((c) => c.id))
      });
    }

    const at = new Date();
    const beforeAndAfter: Array<{
      current: PlantInstancePrimitives;
      updated: PlantInstancePrimitives;
      crop: PlantInstance;
    }> = [];

    for (const item of input.items) {
      const crop = cropsMap.get(createPlantInstanceId(item.id))!;
      const currentPrimitives = crop.toPrimitives();

      if (item.position !== undefined) {
        crop.moveTo(
          new Coordinates(item.position.x, item.position.y),
          user.username,
          at
        );
      }

      crop.updateDetails(
        {
          growthStatus: item.growthStatus,
          variety: item.variety,
          notes: item.notes
        },
        user.username,
        at
      );

      const updatedPrimitives = crop.toPrimitives();
      beforeAndAfter.push({
        current: currentPrimitives,
        updated: updatedPrimitives,
        crop
      });
    }

    const outcomes: WriteOutcome[] = [];
    await this.unitOfWork.run(async () => {
      await this.bedRepository.conditionalIncrementVersion(bed.id, bed.version);
      for (const { current, updated } of beforeAndAfter) {
        const outcome = await this.plantInstanceRepository.updateWithDiff(
          current,
          updated
        );
        outcomes.push(outcome);
      }
    });

    beforeAndAfter.forEach(({ crop }, index) => {
      crop.syncVersion(outcomes[index] ?? 'written');
    });

    return beforeAndAfter.map(({ crop }) => crop);
  }
}
