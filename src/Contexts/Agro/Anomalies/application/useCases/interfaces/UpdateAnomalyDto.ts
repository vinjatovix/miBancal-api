import type { AnomalyGuidanceChanges } from '../../../domain/entities/types/AnomalyGuidanceChanges.js';

/** Merge-patch body: every mutable field optional; lists/optional texts clearable with `null`. */
export type UpdateAnomalyDto = AnomalyGuidanceChanges;
