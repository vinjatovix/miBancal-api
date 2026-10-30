import type { PlantRelationMechanism } from '../../../domain/entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../../domain/entities/types/PlantRelationType.js';

export interface CreatePlantRelationDto {
  id: string;
  sourcePlantId: string;
  targetPlantId: string;
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  proximity: {
    minDistanceCm: number;
    maxDistanceCm: number | null;
  };
  reason: string;
}
