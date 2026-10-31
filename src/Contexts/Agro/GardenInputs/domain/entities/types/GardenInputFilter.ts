import type { ExactFilter } from '../../../../../../shared/domain/query/interfaces/ExactFilter.js';
import type { GardenInputAction } from './GardenInputAction.js';
import type { GardenInputCategory } from './GardenInputCategory.js';
import type { GardenInputStatus } from './GardenInputStatus.js';

export interface GardenInputFilter {
  slug?: ExactFilter<string>;
  category?: ExactFilter<GardenInputCategory>;
  action?: ExactFilter<GardenInputAction>;
  status?: ExactFilter<GardenInputStatus>;
}
