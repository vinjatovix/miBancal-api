import type { Binary, UUID } from 'mongodb';
import type { LocationPrimitives } from '../../../domain/entities/types/LocationPrimitives.js';

export type MongoLocationDocument = {
  _id: string | Binary | UUID;
  userId: string | Binary | UUID;
  name: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  hemisphere?: 'north' | 'south';
  status: LocationPrimitives['status'];
  deletedAt?: string;
  metadata: LocationPrimitives['metadata'];
  version: number;
};
