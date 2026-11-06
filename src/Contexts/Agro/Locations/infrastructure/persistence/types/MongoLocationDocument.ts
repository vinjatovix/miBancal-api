import type { Binary, UUID } from 'mongodb';
import type { LocationPrimitives } from '../../../domain/entities/types/LocationPrimitives.js';

export type MongoLocationDocument = {
  _id: string | Binary | UUID;
  userId: string | Binary | UUID;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  canvasWidth?: number | null;
  canvasHeight?: number | null;
  northAngle?: number | null;
  status: LocationPrimitives['status'];
  deletedAt?: string;
  metadata: LocationPrimitives['metadata'];
  version: number;
};
