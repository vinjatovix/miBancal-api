import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { LocationId } from '../../LocationId.js';
import type { LocationStatus } from './LocationStatus.js';

export type LocationProps = {
  id: LocationId;
  userId: UserId;
  name: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  status?: LocationStatus;
  deletedAt?: Date;
  metadata: Metadata;
  version?: number;
};
