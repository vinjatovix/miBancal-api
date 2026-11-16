import type { PlantRelationMechanism } from '../../entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../entities/types/PlantRelationType.js';
import type { TaxonomicScopePrimitives } from '../../valueObjects/types/TaxonomicScopePrimitives.js';

export type TaxonomicTier = 'species' | 'genus' | 'family' | 'broadcast';

export interface CropPlacement {
  readonly id: string;
  readonly plantId: string;
  readonly scientificName: string;
  readonly familyId?: string;
  readonly position: {
    readonly x: number;
    readonly y: number;
  };
}

export interface ResolvedCompanionInteraction {
  readonly relationId: string;
  readonly source: TaxonomicScopePrimitives;
  readonly target: TaxonomicScopePrimitives;
  readonly type: PlantRelationType;
  readonly mechanism: PlantRelationMechanism;
  readonly strength: number;
  readonly tier: TaxonomicTier;
  readonly specificityScore: number;
  readonly reason: string;
}

export interface CompanionEvaluationResult {
  readonly influencerCropId: string;
  readonly affectedCropId: string;
  readonly distanceCm: number;
  readonly activeRelations: readonly ResolvedCompanionInteraction[];
  readonly shadowedRulesCount: number;
}
