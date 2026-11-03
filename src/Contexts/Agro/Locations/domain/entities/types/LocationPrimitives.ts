import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { LocationStatus } from './LocationStatus.js';

export type LocationPrimitives = {
  id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  status: LocationStatus;
  deletedAt?: string;
  metadata: MetadataPrimitives;
  version: number;
};
