import type { Binary, UUID } from 'mongodb';
import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type { AnomalyCategory } from '../../../domain/entities/types/AnomalyCategory.js';
import type { AnomalyStatus } from '../../../domain/entities/types/AnomalyStatus.js';

export type MongoAnomalyDocument = {
  _id: string | Binary | UUID;
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
  // `save` stores a `Date`; the soft-delete diff (`updateWithDiff`) stores the
  // ISO string from `AnomalyPrimitives`. Hydration normalises both to a `Date`.
  deletedAt?: Date | string;
  metadata: MetadataPrimitives;
  version: number;
};
