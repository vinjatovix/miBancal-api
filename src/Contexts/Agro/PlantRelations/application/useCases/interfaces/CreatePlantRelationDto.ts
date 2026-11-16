import type { PlantRelationMechanism } from '../../../domain/entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../../domain/entities/types/PlantRelationType.js';
import type {
  TaxonomicScopePrimitives,
  TaxonomicSourceScopePrimitives
} from '../../../domain/valueObjects/types/TaxonomicScopePrimitives.js';

type BaseCreatePlantRelationDto = {
  id: string;
  type: PlantRelationType;
  mechanism: PlantRelationMechanism;
  strength: number;
  proximity: {
    minDistanceCm: number;
    maxDistanceCm: number | null;
  };
  reason: string;
};

export type ScopedCreatePlantRelationDto = BaseCreatePlantRelationDto & {
  source: TaxonomicSourceScopePrimitives;
  target: TaxonomicScopePrimitives;
  sourcePlantId?: string | undefined;
  targetPlantId?: string | undefined;
};

export type LegacyCreatePlantRelationDto = BaseCreatePlantRelationDto & {
  sourcePlantId: string;
  targetPlantId: string;
  source?: TaxonomicSourceScopePrimitives | undefined;
  target?: TaxonomicScopePrimitives | undefined;
};

export type CreatePlantRelationDto =
  ScopedCreatePlantRelationDto | LegacyCreatePlantRelationDto;
