export type GardenInputCategory =
  'defense' | 'fertilizer' | 'biostimulant' | 'soil_amendment';

export const GARDEN_INPUT_CATEGORIES = [
  'defense',
  'fertilizer',
  'biostimulant',
  'soil_amendment'
] as const satisfies ReadonlyArray<GardenInputCategory>;
