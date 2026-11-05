import type { ReadOptions } from '../../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { AnomalyField } from '../../queries/AnomalyReadView.js';

export interface GetAnomalyDto {
  options?: ReadOptions<AnomalyField>;
}
