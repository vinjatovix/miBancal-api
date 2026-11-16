/** The plant summary embedded with `include=sourcePlant` or `include=targetPlant`. */
export type PlantSummaryView = {
  readonly id: string;
  readonly slug: string;
  readonly name: {
    readonly primary: string;
    readonly aliases?: readonly string[];
  };
  readonly scientificName: string;
  readonly image: {
    readonly url: string;
    readonly title?: string;
    readonly source?: string;
  } | null;
};

/**
 * What the plant-relations context needs to embed companion plant details:
 * owned by PlantRelations, satisfied by the plant read side, so PlantRelations
 * never imports Plants code.
 */
export interface PlantSummaryReader {
  /** One read; unknown or non-UUID ids are simply missing from the result. */
  findSummariesByIds(
    ids: readonly string[]
  ): Promise<readonly PlantSummaryView[]>;
}
