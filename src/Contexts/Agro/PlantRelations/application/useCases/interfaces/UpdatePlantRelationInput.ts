import type { PlantRelationMechanism } from '../../../domain/entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../../domain/entities/types/PlantRelationType.js';

export interface UpdatePlantRelationInput {
  id: string;
  type?: PlantRelationType;
  mechanism?: PlantRelationMechanism;
  strength?: number;
  proximity?: {
    minDistanceCm: number;
    maxDistanceCm: number | null;
  };
  reason?: string;
}

export type UpdatePlantRelationDto = UpdatePlantRelationInput;
