import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';
import type { ExistingCropSpatial } from '../../domain/services/CropSpatialService.js';

export type LoadPlacedNeighborsParams = {
  bedId: string;
  userId: string;
  excludeCropId?: string | undefined;
};

/**
 * Active crops of a bed that hold a position, with the vital radius of their
 * plant, as the spatial service needs them. Plants are fetched in one query.
 * The vital radius is half the minimum planting spacing (`spacingCm.min / 2`),
 * matching the vital circle the frontend draws.
 *
 * Plants are only soft-deleted and `findByIds` still returns them, so a
 * neighbor plant is missing only with inconsistent data. Its vital radius then
 * counts as 0 and never triggers a collision on its own.
 */
export const loadPlacedNeighbors = async (
  plantInstanceRepository: PlantInstanceRepository,
  plantRepository: PlantRepository,
  { bedId, userId, excludeCropId }: LoadPlacedNeighborsParams
): Promise<ExistingCropSpatial[]> => {
  const activeCrops = await plantInstanceRepository.findActiveByBedId(
    bedId,
    userId
  );
  const placedCrops = activeCrops.filter(
    (crop) => crop.position !== undefined && crop.id !== excludeCropId
  );

  const plants = await plantRepository.findByIds([
    ...new Set(placedCrops.map((crop) => crop.plantId))
  ]);
  const vitalRadiusByPlantId = new Map(
    plants.map((plant) => [plant.id, plant.traits.spacingCm.min / 2])
  );

  return placedCrops.map((crop) => ({
    id: crop.id,
    position: crop.position && { x: crop.position.x, y: crop.position.y },
    vitalRadiusCm: vitalRadiusByPlantId.get(crop.plantId) ?? 0
  }));
};
