export interface ProjectedPlant {
  readonly plantInstanceId: string;
  readonly plantId: string;
  readonly bedId: string;
  readonly scientificName: string;
  readonly familyId?: string | undefined;
  readonly globalPosition: {
    readonly x: number;
    readonly y: number;
  };
  readonly localPosition: {
    readonly x: number;
    readonly y: number;
  };
}
