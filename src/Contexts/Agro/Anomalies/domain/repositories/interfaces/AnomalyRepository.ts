import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
import type { Anomaly } from '../../entities/Anomaly.js';
import type { AnomalyPrimitives } from '../../entities/types/AnomalyPrimitives.js';

export interface AnomalyRepository {
  findById(id: string): Promise<Nullable<Anomaly>>;
  /** Only an anomaly that is not deleted. */
  findActiveById(id: string): Promise<Nullable<Anomaly>>;
  findBySlug(slug: string): Promise<Nullable<Anomaly>>;
  /** Only an anomaly that is not deleted. */
  findActiveBySlug(slug: string): Promise<Nullable<Anomaly>>;
  exists(id: string): Promise<boolean>;
  save(anomaly: Anomaly): Promise<void>;
  /**
   * Receives two complete states of the same aggregate, both produced by the
   * same domain mapper (`toPrimitives` before and after the mutation method).
   * A field missing from `updated` is removed (`$unset`). Never adds audit
   * metadata; only `version` is advanced by storage. Returns `written` or a
   * confirmed `unchanged`.
   */
  updateWithDiff(
    current: AnomalyPrimitives,
    updated: AnomalyPrimitives
  ): Promise<WriteOutcome>;
}
