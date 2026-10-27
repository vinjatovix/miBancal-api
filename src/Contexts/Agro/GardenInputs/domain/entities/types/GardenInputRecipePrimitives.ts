import type { GardenInputDosagePrimitives } from './GardenInputDosagePrimitives.js';
import type { GardenInputStoragePrimitives } from './GardenInputStoragePrimitives.js';

export interface GardenInputIngredientPrimitives {
  item: string;
  quantity: string;
}

export interface GardenInputRecipePrimitives {
  name: string;
  description?: string;
  ingredients: GardenInputIngredientPrimitives[];
  instructions: string[];
  brewTime?: string;
  dosage: GardenInputDosagePrimitives;
  storage?: GardenInputStoragePrimitives;
  safetyNotes?: string[];
}
