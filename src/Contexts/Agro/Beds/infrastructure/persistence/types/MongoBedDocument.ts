import type { Binary, UUID } from 'mongodb';
import type { BedPrimitives } from '../../../domain/entities/types/BedPrimitives.js';

export type MongoBedDocument = {
  _id: string | Binary | UUID;
  userId: string | Binary | UUID;
  locationId?: string | Binary | UUID | null;
  name: string;
  width: number;
  height: number;
  depth: number;
  latitude?: number;
  longitude?: number;
  metadata: BedPrimitives['metadata'];
  deleted: boolean;
  deletedAt?: string;
  version: number;
};
