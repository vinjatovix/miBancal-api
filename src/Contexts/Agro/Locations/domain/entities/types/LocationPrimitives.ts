import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { Hemisphere } from './Hemisphere.js';
import type { LocationStatus } from './LocationStatus.js';

export type LocationPrimitives = {
  id: string;
  userId: string;
  name: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  hemisphere?: Hemisphere;
  status: LocationStatus;
  deletedAt?: string;
  metadata: MetadataPrimitives;
  version: number;
};
