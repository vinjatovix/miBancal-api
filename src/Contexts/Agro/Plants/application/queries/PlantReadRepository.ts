import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import type { PlantField, PlantSparseView } from './PlantReadView.js';
import type { PlantSummary } from './PlantSummary.js';

/**
 * Read port of the plant catalog. Filters, sort keys, collation and paging
 * behave exactly like `PlantRepository.findAll` for the same options. With
 * `fields`, only `id` and those fields are read and returned; without, every
 * field. Relations (`include`) are never resolved here.
 */
export interface PlantReadRepository {
  /** Any status, deleted plants included. */
  findById(
    id: string,
    options?: ReadOptions<PlantField>
  ): Promise<Nullable<PlantSparseView>>;
  /** Only a plant that is not deleted. */
  findActiveById(
    id: string,
    options?: ReadOptions<PlantField>
  ): Promise<Nullable<PlantSparseView>>;
  /** Any status, deleted plants included. */
  findBySlug(
    slug: string,
    options?: ReadOptions<PlantField>
  ): Promise<Nullable<PlantSparseView>>;
  /** Only a plant that is not deleted. */
  findActiveBySlug(
    slug: string,
    options?: ReadOptions<PlantField>
  ): Promise<Nullable<PlantSparseView>>;
  findAll(
    options?: Omit<QueryOptions<PlantFilter, PlantField>, 'include'>
  ): Promise<PaginatedResult<PlantSparseView>>;
  /**
   * The summaries of the stored active plants among `ids`, in one read. Unknown
   * ids, and ids that are not UUIDs, are simply missing from the result.
   */
  findSummariesByIds(ids: readonly string[]): Promise<readonly PlantSummary[]>;
}
