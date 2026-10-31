export type EnrichedPlantSummary = {
  id: string;
  name: string;
  scientificName: string;
  primaryImage: {
    url: string;
    title: string;
    source: string;
  } | null;
  family: {
    id: string;
    name: string;
    slug: string;
  };
};
