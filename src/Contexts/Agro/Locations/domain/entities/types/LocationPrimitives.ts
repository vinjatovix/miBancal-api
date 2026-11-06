import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { LocationStatus } from './LocationStatus.js';

export type LocationPrimitives = {
  id: string;
  userId: string;
  name: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  canvasWidth?: number | undefined;
  canvasHeight?: number | undefined;
  northAngle?: number | undefined;
  status: LocationStatus;
  deletedAt?: string;
  metadata: MetadataPrimitives;
  version: number;
};
