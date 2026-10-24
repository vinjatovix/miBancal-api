import type { Plant } from '../domain/entities/Plant.js';
import type {
  PlantImagePrimitives,
  PlantPrimitives
} from '../domain/entities/types/index.js';
import { plantDomainMapper } from './plantDomainMapper.js';

/**
 * A plant as a write response sends it: primitives plus derived `image` and
 * the read-only `likesCount` projection.
 */
export type PlantWriteResponse = PlantPrimitives & {
  image: PlantImagePrimitives;
  likesCount: number;
};

/**
 * Body of `POST /plants` and `PATCH /plants/{id}`. `image` and `likesCount`
 * are never stored on the aggregate primitives, so they are added here rather
 * than in `plantDomainMapper.toPrimitives`, which feeds persistence.
 */
export const toPlantResponse = (plant: Plant): PlantWriteResponse => ({
  ...plantDomainMapper.toPrimitives(plant),
  image: plant.primaryImage(),
  likesCount: plant.likesCount
});
