import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type { PlantRelationMechanism } from '../../domain/entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../domain/entities/types/PlantRelationType.js';
import type {
  TaxonomicScopePrimitives,
  TaxonomicSourceScopePrimitives
} from '../../domain/valueObjects/types/TaxonomicScopePrimitives.js';
import type { FamilySummaryView } from './FamilySummaryReader.js';
import type { PlantSummaryView } from './PlantSummaryReader.js';

/** The tier through which an `appliesToPlantId` query matched a relation. */
export type AppliesVia = 'plant' | 'genus' | 'family' | 'all';

/** Which side the queried plant sits on: `source` aports, `target` receives. */
export type AppliesRole = 'source' | 'target';

export type PlantRelationReadView = {
  readonly id: string;
  readonly source: TaxonomicSourceScopePrimitives;
  readonly target: TaxonomicScopePrimitives;
  readonly type: PlantRelationType;
  readonly mechanism: PlantRelationMechanism;
  readonly strength: number;
  readonly proximity: {
    readonly minDistanceCm: number;
    readonly maxDistanceCm: number | null;
  };
  readonly reason: string;
  readonly metadata: MetadataPrimitives;
  readonly version: number;
  readonly sourcePlantId?: string | undefined;
  readonly targetPlantId?: string | undefined;
  readonly sourcePlant?: PlantSummaryView | undefined;
  readonly targetPlant?: PlantSummaryView | undefined;
  /** The family named by `source` when `source.scope` is `family` and included. */
  readonly sourceFamily?: FamilySummaryView | undefined;
  /** The family named by `target` when `target.scope` is `family` and included. */
  readonly targetFamily?: FamilySummaryView | undefined;
  /** Only present on an `appliesToPlantId` query: the tier that matched. */
  readonly appliesVia?: AppliesVia | undefined;
  /** Only present on an `appliesToPlantId` query: the queried plant's side. */
  readonly role?: AppliesRole | undefined;
};

export const PLANT_RELATION_FIELDS = [
  'id',
  'source',
  'target',
  'sourcePlantId',
  'targetPlantId',
  'type',
  'mechanism',
  'strength',
  'proximity',
  'reason',
  'metadata',
  'version'
] as const satisfies readonly (keyof PlantRelationReadView)[];

export type PlantRelationField = (typeof PLANT_RELATION_FIELDS)[number];

export const PLANT_RELATION_RELATIONS = [
  'sourcePlant',
  'targetPlant',
  'sourceFamily',
  'targetFamily'
] as const;

export type PlantRelationRelation = (typeof PLANT_RELATION_RELATIONS)[number];
