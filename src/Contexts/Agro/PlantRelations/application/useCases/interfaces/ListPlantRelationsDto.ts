import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { PlantRelationFilter } from '../../../domain/entities/types/PlantRelationFilter.js';
import type {
  PlantRelationField,
  PlantRelationRelation
} from '../../queries/index.js';

export interface ListPlantRelationsDto {
  query?: QueryOptions<
    PlantRelationFilter,
    PlantRelationField,
    PlantRelationRelation
  >;
}
