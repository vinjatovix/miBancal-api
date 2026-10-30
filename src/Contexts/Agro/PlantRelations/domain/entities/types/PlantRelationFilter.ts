import type { ExactFilter } from '../../../../../../shared/domain/query/interfaces/ExactFilter.js';
import type { PlantRelationMechanism } from './PlantRelationMechanism.js';
import type { PlantRelationType } from './PlantRelationType.js';

export interface PlantRelationFilter {
  sourcePlantId?: ExactFilter<string>;
  targetPlantId?: ExactFilter<string>;
  plantId?: ExactFilter<string>;
  type?: ExactFilter<PlantRelationType>;
  mechanism?: ExactFilter<PlantRelationMechanism>;
}
