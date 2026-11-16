import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { GardenInputFilter } from '../../domain/entities/types/GardenInputFilter.js';
import type {
  GardenInputField,
  GardenInputSparseView
} from './GardenInputReadView.js';

export interface GardenInputReadRepository {
  findById(
    id: string,
    options?: ReadOptions<GardenInputField>
  ): Promise<Nullable<GardenInputSparseView>>;
  findActiveById(
    id: string,
    options?: ReadOptions<GardenInputField>
  ): Promise<Nullable<GardenInputSparseView>>;
  findBySlug(
    slug: string,
    options?: ReadOptions<GardenInputField>
  ): Promise<Nullable<GardenInputSparseView>>;
  findActiveBySlug(
    slug: string,
    options?: ReadOptions<GardenInputField>
  ): Promise<Nullable<GardenInputSparseView>>;
  findAll(
    options?: Omit<QueryOptions<GardenInputFilter, GardenInputField>, 'include'>
  ): Promise<PaginatedResult<GardenInputSparseView>>;
  findExistingSlugs(slugs: readonly string[]): Promise<readonly string[]>;
}
