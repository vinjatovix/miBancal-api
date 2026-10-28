import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { ProximityDistancePrimitives } from '../../valueObjects/types/ProximityDistancePrimitives.js';
import type { PlantRelationMechanism } from './PlantRelationMechanism.js';
import type { PlantRelationType } from './PlantRelationType.js';

export type PlantRelationPrimitives = {
  id: string;
  sourcePlantId: string;
  targetPlantId: string;
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  proximity: ProximityDistancePrimitives;
  reason: string;
  metadata: MetadataPrimitives;
  version: number;
};
