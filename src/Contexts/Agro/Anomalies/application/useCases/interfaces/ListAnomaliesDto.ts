import type { QueryOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { AnomalyFilter } from '../../../domain/entities/types/AnomalyFilter.js';
import type { AnomalyField } from '../../queries/AnomalyReadView.js';

export interface ListAnomaliesDto {
  query?: Omit<QueryOptions<AnomalyFilter, AnomalyField>, 'include'>;
}
