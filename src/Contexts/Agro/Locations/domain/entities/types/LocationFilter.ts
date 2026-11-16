import type { ExactFilter } from '../../../../../../shared/domain/query/interfaces/ExactFilter.js';

export interface LocationFilter {
  userId?: ExactFilter<string>;
}
