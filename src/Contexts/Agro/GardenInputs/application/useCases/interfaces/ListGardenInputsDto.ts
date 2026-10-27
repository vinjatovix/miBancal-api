import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { GardenInputFilter } from '../../../domain/entities/types/GardenInputFilter.js';
import type { GardenInputField } from '../../queries/GardenInputReadView.js';

export interface ListGardenInputsDto {
  query?: Omit<QueryOptions<GardenInputFilter, GardenInputField>, 'include'>;
}
