import { deriveGenus } from '../../../../shared/domain/utils/deriveGenus.js';
import type { Plant } from '../domain/entities/Plant.js';
import type {
  PlantImagePrimitives,
  PlantPrimitives
} from '../domain/entities/types/index.js';
import { plantDomainMapper } from './plantDomainMapper.js';

/**
 * A plant as a write response sends it: primitives plus derived `image`, the
 * `genus` read projection and the read-only `likesCount` projection.
 */
export type PlantWriteResponse = Omit<PlantPrimitives, 'identity'> & {
  identity: PlantPrimitives['identity'] & { genus?: string };
  image: PlantImagePrimitives;
  likesCount: number;
};

/**
 * Body of `POST /plants` and `PATCH /plants/{id}`. `image`, `genus` and
 * `likesCount` are never stored on the aggregate primitives, so they are added
 * here rather than in `plantDomainMapper.toPrimitives`, which feeds
 * persistence. `genus` is derived the same way as in the read view, so a write
 * response and a later read stay identical (parity).
 */
export const toPlantResponse = (plant: Plant): PlantWriteResponse => {
  const primitives = plantDomainMapper.toPrimitives(plant);
  const genus = deriveGenus(primitives.identity.scientificName);

  return {
    ...primitives,
    identity: {
      ...primitives.identity,
      ...(genus !== undefined && { genus })
    },
    image: plant.primaryImage(),
    likesCount: plant.likesCount
  };
};
