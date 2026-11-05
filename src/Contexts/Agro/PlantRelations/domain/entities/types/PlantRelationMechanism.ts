export const PlantRelationMechanisms = [
  'pest_repellent',
  'pollinator_attractor',
  'nitrogen_fixer',
  'nutrient_accumulator',
  'growth_stimulator',
  'trap_crop',
  'physical_support',
  'shade_provider',
  'allelopathy',
  'pest_host',
  'disease_vector',
  'resource_competition'
] as const;

export type PlantRelationMechanism = (typeof PlantRelationMechanisms)[number];
