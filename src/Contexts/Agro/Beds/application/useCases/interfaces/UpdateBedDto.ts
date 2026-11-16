export interface UpdateBedDto {
  name?: string;
  width?: number;
  height?: number;
  depth?: number;
  locationId?: string;
  position?: { x: number; y: number } | null;
  rotation?: number;
}
