import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Bed } from '../../../Beds/domain/entities/Bed.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import type { PlantInstance } from '../../../PlantInstances/domain/entities/PlantInstance.js';
import {
  CropGrowthStatus,
  PlantInstanceLifecycleStatus
} from '../../../PlantInstances/domain/entities/types/index.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { PlantRelationRepository } from '../../../PlantRelations/domain/repositories/interfaces/PlantRelationRepository.js';
import { CrossBedCompanionService } from '../../../PlantRelations/domain/services/CrossBedCompanionService.js';
import { SpatialProjectionService } from '../../../PlantRelations/domain/services/SpatialProjectionService.js';
import type { CompanionGraphEdge } from '../../../PlantRelations/domain/services/types/CompanionGraphEdge.js';
import type { ProjectedPlant } from '../../../PlantRelations/domain/services/types/ProjectedPlant.js';
import type { Plant } from '../../../Plants/domain/entities/Plant.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';
import type {
  LocationLayoutView,
  PlacedBedSummary,
  UnplacedBedSummary
} from './types/LocationLayoutDto.js';

export type GetLocationLayoutDependencies = {
  locationRepository: LocationRepository;
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
  plantRepository: PlantRepository;
  plantRelationRepository: PlantRelationRepository;
};

export class GetLocationLayout {
  private readonly locationRepository: LocationRepository;
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly plantRepository: PlantRepository;
  private readonly plantRelationRepository: PlantRelationRepository;
  private readonly spatialProjectionService: SpatialProjectionService;
  private readonly crossBedCompanionService: CrossBedCompanionService;

  constructor({
    locationRepository,
    bedRepository,
    plantInstanceRepository,
    plantRepository,
    plantRelationRepository
  }: GetLocationLayoutDependencies) {
    this.locationRepository = locationRepository;
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.plantRepository = plantRepository;
    this.plantRelationRepository = plantRelationRepository;
    this.spatialProjectionService = new SpatialProjectionService();
    this.crossBedCompanionService = new CrossBedCompanionService();
  }

  async execute(
    locationId: string,
    userId: string
  ): Promise<LocationLayoutView> {
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(locationId, userId),
      'Location',
      locationId
    );

    const allBeds = await this.bedRepository.findByUserId(userId, {
      locationId
    });

    const placedBeds: Bed[] = [];
    const unplacedBeds: Bed[] = [];

    for (const bed of allBeds) {
      if (bed.position !== undefined) {
        placedBeds.push(bed);
      } else {
        unplacedBeds.push(bed);
      }
    }

    const companionGraph = await this.computeCompanionGraph(placedBeds, userId);

    const placedSummaries: PlacedBedSummary[] = placedBeds.map((bed) => {
      const netOrientation = this.calculateNetOrientation(location, bed);
      return {
        id: bed.id,
        name: bed.name.value,
        width: bed.width.value,
        height: bed.height.value,
        position: bed.position!,
        rotation: bed.rotation ?? 0,
        netOrientation
      };
    });

    const unplacedSummaries: UnplacedBedSummary[] = unplacedBeds.map((bed) => ({
      id: bed.id,
      name: bed.name.value,
      width: bed.width.value,
      height: bed.height.value,
      position: null,
      rotation: 0
    }));

    return {
      location: {
        id: location.id,
        name: location.name,
        ...(location.northAngle !== undefined && {
          northAngle: location.northAngle
        }),
        ...(location.canvasWidth !== undefined && {
          width: location.canvasWidth
        }),
        ...(location.canvasHeight !== undefined && {
          height: location.canvasHeight
        }),
        version: location.version
      },
      placedBeds: placedSummaries,
      unplacedBeds: unplacedSummaries,
      companionGraph
    };
  }

  private calculateNetOrientation(location: Location, bed: Bed): number {
    if (location.northAngle !== undefined && bed.rotation !== undefined) {
      return (location.northAngle + bed.rotation) % 360;
    }
    return bed.netOrientation ?? bed.rotation ?? 0;
  }

  private async computeCompanionGraph(
    placedBeds: readonly Bed[],
    userId: string
  ): Promise<CompanionGraphEdge[]> {
    if (placedBeds.length === 0) return [];

    const placedBedIds = placedBeds.map((bed) => bed.id);
    const crops = await this.plantInstanceRepository.findActiveByBedIds(
      placedBedIds,
      userId
    );

    const livingCrops = crops.filter(
      (crop) =>
        crop.position !== undefined &&
        crop.instanceStatus === PlantInstanceLifecycleStatus.ACTIVE &&
        crop.growthStatus !== CropGrowthStatus.HARVESTED
    );

    if (livingCrops.length < 2) return [];

    const plantIds = [...new Set(livingCrops.map((crop) => crop.plantId))];
    const plants = await this.plantRepository.findByIds(plantIds);
    const plantsById = new Map(plants.map((plant) => [plant.id, plant]));
    const bedMap = new Map(placedBeds.map((bed) => [bed.id, bed]));

    const projectedPlants = this.projectLivingCrops(
      livingCrops,
      bedMap,
      plantsById
    );

    if (projectedPlants.length < 2) return [];

    const candidateRules =
      await this.plantRelationRepository.findForPlantBatch(plantIds);

    return this.crossBedCompanionService.evaluateLayout(
      projectedPlants,
      candidateRules
    );
  }

  private projectLivingCrops(
    livingCrops: readonly PlantInstance[],
    bedMap: Map<string, Bed>,
    plantsById: Map<string, Plant>
  ): ProjectedPlant[] {
    const projected: ProjectedPlant[] = [];

    for (const crop of livingCrops) {
      if (!crop.position) continue;
      const bed = bedMap.get(crop.bedId);
      if (!bed?.position) continue;
      const plant = plantsById.get(crop.plantId);
      if (!plant) continue;

      projected.push(
        this.spatialProjectionService.projectPlant(
          crop.id,
          crop.plantId,
          bed.id,
          plant.identity.scientificName,
          crop.position,
          bed.position,
          bed.rotation ?? 0,
          plant.identity.family
        )
      );
    }

    return projected;
  }
}
