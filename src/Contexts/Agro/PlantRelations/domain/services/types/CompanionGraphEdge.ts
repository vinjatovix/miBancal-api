export type CompanionScope = 'intra_bed' | 'cross_bed';

export interface CompanionGraphEdge {
  readonly sourcePlantInstanceId: string;
  readonly targetPlantInstanceId: string;
  readonly sourceBedId: string;
  readonly targetBedId: string;
  readonly relationType: 'beneficial' | 'detrimental';
  readonly mechanism: string;
  readonly strength: number;
  readonly distanceCm: number;
  readonly scope: CompanionScope;
  readonly reason: string;
}
