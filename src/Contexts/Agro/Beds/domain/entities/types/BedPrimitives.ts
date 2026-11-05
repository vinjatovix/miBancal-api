import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';

export type BedPrimitives = {
  id: string;
  userId: string;
  locationId: string | null;
  name: string;
  width: number;
  height: number;
  depth: number;
  latitude?: number;
  longitude?: number;
  metadata: MetadataPrimitives;
  deleted: boolean;
  deletedAt?: string;
  version: number;
};
