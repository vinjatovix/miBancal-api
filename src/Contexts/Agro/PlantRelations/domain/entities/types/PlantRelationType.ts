export const PlantRelationTypes = ['beneficial', 'detrimental'] as const;

export type PlantRelationType = (typeof PlantRelationTypes)[number];
