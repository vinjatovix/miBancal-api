/**
 * Closed set of exactly four anomaly categories (FR-016). `disorder` is the
 * stored/API form of the spec's "physiological disorder". Finer taxonomy lives
 * in free-text guidance, never as a category.
 */
export type AnomalyCategory = 'pest' | 'disease' | 'disorder' | 'weed';

export const ANOMALY_CATEGORIES = [
  'pest',
  'disease',
  'disorder',
  'weed'
] as const satisfies ReadonlyArray<AnomalyCategory>;
