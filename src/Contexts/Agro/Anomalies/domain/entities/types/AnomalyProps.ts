import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { AnomalyId } from '../../AnomalyId.js';
import type { AnomalyCategory } from './AnomalyCategory.js';
import type { AnomalyStatus } from './AnomalyStatus.js';

export type AnomalyProps = {
  id: AnomalyId;
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
  status?: AnomalyStatus;
  deletedAt?: Date;
  metadata: Metadata;
  version?: number;
};
