import type { BedPosition } from '../../../../Beds/domain/entities/types/BedPosition.js';

export type BedLayoutPlacementItem = {
  id: string;
  position: BedPosition | null;
  rotation?: number | undefined;
};

export type UpdateLocationBedsLayoutInput = {
  locationId: string;
  userId: string;
  layouts: BedLayoutPlacementItem[];
};
