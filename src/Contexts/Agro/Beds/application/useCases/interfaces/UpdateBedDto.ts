export interface UpdateBedDto {
  name?: string;
  width?: number;
  height?: number;
  depth?: number;
  /** A uuid re-snapshots from that owned location (replace); `null` clears
   * the snapshot; omitted leaves it unchanged. */
  locationId?: string | null;
}
