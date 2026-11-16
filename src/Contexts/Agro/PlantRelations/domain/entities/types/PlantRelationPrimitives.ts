import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { ProximityDistancePrimitives } from '../../valueObjects/types/ProximityDistancePrimitives.js';
import type {
  TaxonomicScopePrimitives,
  TaxonomicSourceScopePrimitives
} from '../../valueObjects/types/TaxonomicScopePrimitives.js';
import type { PlantRelationMechanism } from './PlantRelationMechanism.js';
import type { PlantRelationType } from './PlantRelationType.js';

export type PlantRelationPrimitives = {
  id: string;
  source: TaxonomicSourceScopePrimitives;
  target: TaxonomicScopePrimitives;
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  proximity: ProximityDistancePrimitives;
  reason: string;
  metadata: MetadataPrimitives;
  version: number;
  sourcePlantId?: string | undefined;
  targetPlantId?: string | undefined;
};
