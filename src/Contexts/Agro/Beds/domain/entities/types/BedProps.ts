import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { PositiveNumber } from '../../../../../shared/domain/valueObject/PositiveNumber.js';
import type { BedId } from '../../BedId.js';
import type { BedName } from '../../BedName.js';

export type BedProps = {
  id: BedId;
  userId: UserId;
  locationId?: string | null;
  name: BedName;
  width: PositiveNumber;
  height: PositiveNumber;
  depth: PositiveNumber;
  latitude?: number;
  longitude?: number;
  position?: { x: number; y: number } | undefined;
  rotation?: number | undefined;
  netOrientation?: number | undefined;

  metadata: Metadata;
  deleted: boolean;
  deletedAt?: Date;
  version?: number;
};
