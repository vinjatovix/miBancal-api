export type GardenInputApplicationMethod =
  'foliar' | 'irrigation' | 'soil' | 'soaking' | 'dusting' | 'other';

export const GARDEN_INPUT_APPLICATION_METHODS = [
  'foliar',
  'irrigation',
  'soil',
  'soaking',
  'dusting',
  'other'
] as const satisfies ReadonlyArray<GardenInputApplicationMethod>;

export interface GardenInputDosagePrimitives {
  method: GardenInputApplicationMethod;
  dilution: string;
  frequency: string;
}
