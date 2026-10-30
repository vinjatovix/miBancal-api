import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type { PlantRelationMechanism } from '../../domain/entities/types/PlantRelationMechanism.js';
import type { PlantRelationType } from '../../domain/entities/types/PlantRelationType.js';
import type { PlantSummaryView } from './PlantSummaryReader.js';

export type PlantRelationReadView = {
  readonly id: string;
  readonly sourcePlantId: string;
  readonly targetPlantId: string;
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
  readonly sourcePlant?: PlantSummaryView;
  readonly targetPlant?: PlantSummaryView;
};

export const PLANT_RELATION_FIELDS = [
  'id',
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

export const PLANT_RELATION_RELATIONS = ['sourcePlant', 'targetPlant'] as const;

export type PlantRelationRelation = (typeof PLANT_RELATION_RELATIONS)[number];
