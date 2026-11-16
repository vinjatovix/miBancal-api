export type GardenInputAction =
  | 'fungicide'
  | 'insecticide'
  | 'repellent'
  | 'nematicide'
  | 'fertilizer'
  | 'biostimulant'
  | 'rooting'
  | 'compost_activator';

export const GARDEN_INPUT_ACTIONS = [
  'fungicide',
  'insecticide',
  'repellent',
  'nematicide',
  'fertilizer',
  'biostimulant',
  'rooting',
  'compost_activator'
] as const satisfies ReadonlyArray<GardenInputAction>;
