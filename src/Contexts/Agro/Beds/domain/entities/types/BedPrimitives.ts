import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';

export type BedPrimitives = {
  id: string;
  userId: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  postalCode?: string;
  country?: string;
  timezone?: string;
  hemisphere?: 'north' | 'south';
  metadata: MetadataPrimitives;
  deleted: boolean;
  deletedAt?: string;
  version: number;
};
