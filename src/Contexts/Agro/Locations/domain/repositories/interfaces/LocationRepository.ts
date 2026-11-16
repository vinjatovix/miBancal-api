import type { PaginatedResult } from '../../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
import type { Location } from '../../entities/Location.js';
import type { LocationFilter } from '../../entities/types/LocationFilter.js';
import type { LocationPrimitives } from '../../entities/types/LocationPrimitives.js';

export interface LocationRepository {
  /** Insert-only: the id is client-suppliable, like Bed. */
  create(location: Location): Promise<void>;
  findOwnedActiveById(id: string, userId: string): Promise<Nullable<Location>>;
  conditionalIncrementVersion(
    id: string,
    expectedVersion: number
  ): Promise<void>;
  /** Batch resolution for multiple location IDs owned by the user. */
  findActiveByIdsForOwner(ids: string[], userId: string): Promise<Location[]>;
  /** Case/accent-insensitive equality under the `es`/strength-1 collation. */
  findActiveByNameForOwner(
    userId: string,
    name: string
  ): Promise<Nullable<Location>>;
  findByUserId(userId: string): Promise<Location[]>;
  findAll(
    options?: QueryOptions<LocationFilter>
  ): Promise<PaginatedResult<Location>>;
  /**
   * Receives two complete states of the same aggregate, both produced by the
   * same domain mapper (`toPrimitives` before and after the mutation
   * method). A field missing from `updated` is removed (`$unset`). Returns
   * `written` (version advanced by one) or `unchanged` (confirmed no-op).
   */
  updateWithDiff(
    current: LocationPrimitives,
    updated: LocationPrimitives
  ): Promise<WriteOutcome>;
}
