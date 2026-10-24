import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { AnomalyFilter } from '../../domain/entities/types/AnomalyFilter.js';
import type { AnomalyField, AnomalySparseView } from './AnomalyReadView.js';

/**
 * Read port of the anomaly catalog. Filters, sort keys and paging behave
 * exactly like `AnomalyRepository.findAll` for the same options. With `fields`,
 * only `id` and those fields are read and returned; without, every field.
 * Soft-deleted entries are hidden from the `*Active*` reads.
 */
export interface AnomalyReadRepository {
  /** Any status, deleted anomalies included. */
  findById(
    id: string,
    options?: ReadOptions<AnomalyField>
  ): Promise<Nullable<AnomalySparseView>>;
  /** Only an anomaly that is not deleted. */
  findActiveById(
    id: string,
    options?: ReadOptions<AnomalyField>
  ): Promise<Nullable<AnomalySparseView>>;
  /** Any status, deleted anomalies included. */
  findBySlug(
    slug: string,
    options?: ReadOptions<AnomalyField>
  ): Promise<Nullable<AnomalySparseView>>;
  /** Only an anomaly that is not deleted. */
  findActiveBySlug(
    slug: string,
    options?: ReadOptions<AnomalyField>
  ): Promise<Nullable<AnomalySparseView>>;
  findAll(
    options?: Omit<QueryOptions<AnomalyFilter, AnomalyField>, 'include'>
  ): Promise<PaginatedResult<AnomalySparseView>>;
  /**
   * The slugs among `slugs` that belong to a stored `ACTIVE` anomaly, read in
   * one indexed `$in`. Used by plant writes to validate references (FR-014).
   * Unknown slugs are simply missing from the result.
   */
  findExistingSlugs(slugs: readonly string[]): Promise<readonly string[]>;
}
