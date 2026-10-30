import type { Binary } from 'bson';
import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { PlantRelationMechanism } from '../../../domain/entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../../domain/entities/types/PlantRelationType.js';

export type MongoPlantRelationDocument = {
  _id: Binary | string;
  source?: {
    scope: 'plant' | 'genus' | 'family';
    value?: Binary | string;
  };
  target?: {
    scope: 'plant' | 'genus' | 'family' | 'all';
    value?: Binary | string;
  };
  sourcePlantId?: Binary | string;
  targetPlantId?: Binary | string;
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  minDistanceCm: number;
  maxDistanceCm: number | null;
  reason: string;
  metadata: MetadataPrimitives;
  version: number;
};
