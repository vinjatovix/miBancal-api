import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { LocationId } from '../../LocationId.js';
import type { Hemisphere } from './Hemisphere.js';
import type { LocationStatus } from './LocationStatus.js';

export type LocationProps = {
  id: LocationId;
  userId: UserId;
  name: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  hemisphere?: Hemisphere;
  status?: LocationStatus;
  deletedAt?: Date;
  metadata: Metadata;
  version?: number;
};
