/**
 * Closed set of exactly three anomaly categories (FR-016). `disorder` is the
 * stored/API form of the spec's "physiological disorder". Finer taxonomy lives
 * in free-text guidance, never as a category.
 */
export type AnomalyCategory = 'pest' | 'disease' | 'disorder';

export const ANOMALY_CATEGORIES = [
  'pest',
  'disease',
  'disorder'
] as const satisfies ReadonlyArray<AnomalyCategory>;
