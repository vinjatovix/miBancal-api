import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type { AnomalyCategory } from '../../../domain/entities/types/AnomalyCategory.js';

export interface CreateAnomalyDto {
  id: string;
  slug: string;
  name: string;
  category: AnomalyCategory;
  scientificName?: string;
  description?: string;
  symptoms?: string[];
  damage?: string[];
  causes?: string[];
  affectedCrops?: string[];
  prevention?: string[];
  treatment?: string[];
  naturalEnemies?: string[];
  resources?: SupportResourcePrimitives[];
  confusedWith?: string[];
}
