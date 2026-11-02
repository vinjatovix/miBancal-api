export interface CreateBedDto {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  /** When present, resolved to an owned active location whose provided
   * geographic fields are copied into the bed as a static snapshot. */
  locationId?: string;
}
