import type { ExactFilter } from '../../../../../../shared/domain/query/interfaces/ExactFilter.js';
import type { AnomalyCategory } from './AnomalyCategory.js';
import type { AnomalyStatus } from './AnomalyStatus.js';

export interface AnomalyFilter {
  slug?: ExactFilter<string>;
  category?: ExactFilter<AnomalyCategory>;
  status?: ExactFilter<AnomalyStatus>;
}
