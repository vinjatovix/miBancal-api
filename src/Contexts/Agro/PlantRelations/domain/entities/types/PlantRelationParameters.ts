import type { PlantId } from '../../../../Plants/domain/PlantId.js';
import type { PlantRelationId } from '../../PlantRelationId.js';
import type { ProximityDistance } from '../../valueObjects/ProximityDistance.js';
import type { TaxonomicScope } from '../../valueObjects/TaxonomicScope.js';
import type { PlantRelationMechanism } from './PlantRelationMechanism.js';
import type { PlantRelationType } from './PlantRelationType.js';

export type PlantRelationParameters = {
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  proximity: ProximityDistance;
  reason: string;
};

export type UpdatePlantRelationParameters = PlantRelationParameters;

export type CreatePlantRelationParams = {
  id?: PlantRelationId | undefined;
  source?: TaxonomicScope | undefined;
  target?: TaxonomicScope | undefined;
  sourcePlantId?: PlantId | undefined;
  targetPlantId?: PlantId | undefined;
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  proximity: ProximityDistance;
  reason: string;
  user: string;
  at?: Date | undefined;
};
