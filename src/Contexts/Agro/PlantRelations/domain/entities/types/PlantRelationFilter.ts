import type { ExactFilter } from '../../../../../../shared/domain/query/interfaces/ExactFilter.js';
import type {
  TaxonomicScopeType,
  TaxonomicSourceScopeType
} from '../../valueObjects/types/TaxonomicScopePrimitives.js';
import type { PlantRelationMechanism } from './PlantRelationMechanism.js';
import type { PlantRelationType } from './PlantRelationType.js';

/**
 * A plant resolved to the taxonomic coordinates a relation can match it by.
 * Built by the application layer from a plant id (the query mapper does no IO):
 * `genus` is derived from the plant's scientific name and `familyId` from its
 * family, and either may be absent when it cannot be resolved.
 */
export interface AppliesToScope {
  plantId: string;
  genus?: string | undefined;
  familyId?: string | undefined;
}

export interface PlantRelationFilter {
  sourcePlantId?: ExactFilter<string> | undefined;
  targetPlantId?: ExactFilter<string> | undefined;
  plantId?: ExactFilter<string> | undefined;
  sourceScope?: ExactFilter<TaxonomicSourceScopeType> | undefined;
  targetScope?: ExactFilter<TaxonomicScopeType> | undefined;
  genus?: ExactFilter<string> | undefined;
  familyId?: ExactFilter<string> | undefined;
  type?: ExactFilter<PlantRelationType> | undefined;
  mechanism?: ExactFilter<PlantRelationMechanism> | undefined;
  /**
   * Transport input: the plant to resolve. The application layer expands it
   * into `appliesTo` before the query reaches persistence; the query mapper
   * ignores this field.
   */
  appliesToPlantId?: ExactFilter<string> | undefined;
  /**
   * Resolved "applies to this plant" scope. Matches relations where the plant
   * participates as source OR target through any tier (plant/genus/family) plus
   * broadcast (`target.scope = all`), in a single OR clause.
   */
  appliesTo?: AppliesToScope | undefined;
}
