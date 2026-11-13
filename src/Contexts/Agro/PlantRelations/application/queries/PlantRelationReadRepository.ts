import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { PlantRelationFilter } from '../../domain/entities/types/PlantRelationFilter.js';
import type {
  PlantRelationField,
  PlantRelationReadView
} from './PlantRelationReadView.js';

export interface PlantRelationReadRepository {
  findById(id: string): Promise<Nullable<PlantRelationReadView>>;
  findAll(
    options?: Omit<
      QueryOptions<PlantRelationFilter, PlantRelationField>,
      'include'
    >
  ): Promise<PaginatedResult<PlantRelationReadView>>;
}
