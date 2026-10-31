import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type { AnomalyCategory } from './AnomalyCategory.js';
import type { AnomalyStatus } from './AnomalyStatus.js';

export type AnomalyPrimitives = {
  id: string;
  slug: string;
  name: string;
  scientificName?: string;
  category: AnomalyCategory;
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
  status: AnomalyStatus;
  /** ISO string; present only while `DELETED`, never persisted/returned as `null`. */
  deletedAt?: string;
  metadata: MetadataPrimitives;
  version: number;
};
