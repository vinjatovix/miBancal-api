import type { AnomalyCategory } from './AnomalyCategory.js';

/**
 * Merge-patch change set. `undefined` keeps a field, any other value replaces
 * it; optional single texts and guidance lists additionally accept `null` to
 * clear them. `slug` is immutable after creation and is not part of the set.
 */
export type AnomalyGuidanceChanges = {
  name?: string;
  category?: AnomalyCategory;
  scientificName?: string | null;
  description?: string | null;
  symptoms?: string[] | null;
  damage?: string[] | null;
  causes?: string[] | null;
  affectedCrops?: string[] | null;
  prevention?: string[] | null;
  treatment?: string[] | null;
  naturalEnemies?: string[] | null;
};
