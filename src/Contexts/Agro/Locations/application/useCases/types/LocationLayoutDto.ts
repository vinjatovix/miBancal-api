import type { BedPosition } from '../../../../Beds/domain/entities/types/BedPosition.js';
import type { CompanionGraphEdge } from '../../../../PlantRelations/domain/services/types/CompanionGraphEdge.js';

export interface PlacedBedSummary {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly position: BedPosition;
  readonly rotation: number;
  readonly netOrientation: number;
}

export interface UnplacedBedSummary {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly position: null;
  readonly rotation: 0;
}

export interface LocationCanvasSummary {
  readonly id: string;
  readonly name: string;
  readonly northAngle?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly version: number;
}

export interface LocationLayoutView {
  readonly location: LocationCanvasSummary;
  readonly placedBeds: readonly PlacedBedSummary[];
  readonly unplacedBeds: readonly UnplacedBedSummary[];
  readonly companionGraph: readonly CompanionGraphEdge[];
}
