import { Coordinates } from '../../../../../shared/domain/value-objects/Coordinates.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { DomainNotFoundException } from '../../../../shared/domain/errors/index.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import { createBedId } from '../../../Beds/domain/BedId.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import { PlantInstance } from '../../domain/entities/PlantInstance.js';
import {
  CropGrowthStatus,
  PlantInstanceLifecycleStatus
} from '../../domain/entities/types/index.js';
import { createPlantInstanceId } from '../../domain/PlantInstanceId.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import type { CropSpatialService } from '../../domain/services/CropSpatialService.js';
import { loadPlacedNeighbors } from './loadPlacedNeighbors.js';

export type PlacePlantInstanceBatchItemInput = {
  id: string;
  plantId: string;
  position?: { x: number; y: number } | undefined;
  growthStatus?: CropGrowthStatus | undefined;
  variety?: string | null | undefined;
  notes?: string | null | undefined;
};

export type PlacePlantInstanceBatchInput = {
  bedId: string;
  items: PlacePlantInstanceBatchItemInput[];
};

export type PlacePlantInstanceBatchDependencies = {
  bedRepository: BedRepository;
  plantRepository: PlantRepository;
  plantInstanceRepository: PlantInstanceRepository;
  cropSpatialService: CropSpatialService;
  unitOfWork: UnitOfWork;
};

export class PlacePlantInstanceBatch {
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
  }: PlacePlantInstanceBatchDependencies) {
    this.bedRepository = bedRepository;
    this.plantRepository = plantRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.cropSpatialService = cropSpatialService;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    input: PlacePlantInstanceBatchInput,
    user: UserSessionInfo
  ): Promise<PlantInstance[]> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(input.bedId, user.id),
      'Bed',
      input.bedId
    );

    const uniquePlantIds = [
      ...new Set(input.items.map((item) => item.plantId))
    ].map((id) => createPlantId(id));
    const plants = await this.plantRepository.findByIds(uniquePlantIds);
    const activePlantsMap = new Map(
      plants.filter((p) => !p.isDeleted()).map((p) => [p.id, p])
    );

    for (const plantId of uniquePlantIds) {
      if (!activePlantsMap.has(plantId)) {
        throw new DomainNotFoundException(`Plant not found: ${plantId}`);
      }
    }

    const hasPlacedItems = input.items.some(
      (item) => item.position !== undefined
    );

    if (hasPlacedItems) {
      const existingCrops = await loadPlacedNeighbors(
        this.plantInstanceRepository,
        this.plantRepository,
        { bedId: bed.id, userId: user.id }
      );

      const spatialItems = input.items.map((item, index) => {
        const plant = activePlantsMap.get(createPlantId(item.plantId))!;
        return {
          itemIndex: index,
          id: item.id,
          position: item.position,
          vitalRadiusCm: plant.traits.spacingCm.min / 2
        };
      });

      this.cropSpatialService.validateBatchPlacement({
        bed: {
          width: bed.width.value,
          height: bed.height.value
        },
        items: spatialItems,
        existingCrops
      });
    }

    const plantedAt = new Date();
    const metadata = Metadata.create(user.username);

    const instances = input.items.map((item) =>
      PlantInstance.create({
        id: createPlantInstanceId(item.id),
        userId: createUserId(user.id),
        bedId: createBedId(bed.id),
        plantId: createPlantId(item.plantId),
        position: item.position
          ? new Coordinates(item.position.x, item.position.y)
          : undefined,
        growthStatus: item.growthStatus ?? CropGrowthStatus.PLANTED,
        instanceStatus: PlantInstanceLifecycleStatus.ACTIVE,
        plantedAt,
        ...(item.variety ? { variety: item.variety } : {}),
        ...(item.notes ? { notes: item.notes } : {}),
        metadata,
        version: 0
      })
    );

    await this.unitOfWork.run(async () => {
      await this.bedRepository.conditionalIncrementVersion(bed.id, bed.version);
      await this.plantInstanceRepository.saveMany(instances);
    });

    return instances;
  }
}
