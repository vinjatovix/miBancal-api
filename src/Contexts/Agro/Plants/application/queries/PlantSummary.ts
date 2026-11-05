/** The minimal summary of a plant for embedding in consumer contexts. */
export type PlantSummary = {
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
