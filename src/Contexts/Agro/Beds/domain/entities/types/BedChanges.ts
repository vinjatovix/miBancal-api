import type { BedDimensionsChanges } from './BedDimensionsChanges.js';

export type BedChanges = {
  name?: string;
  dimensions: BedDimensionsChanges;
  /** A uuid re-snapshots from that owned location (replace); `null` clears
   * the snapshot; omitted leaves it unchanged. */
  locationId?: string | null;
  position?: { x: number; y: number } | null;
  rotation?: number;
};
