import { createUserId } from '../../../Auth/domain/UserId.js';
import {
  Metadata,
  PositiveNumber
} from '../../../shared/domain/valueObject/index.js';
import { createBedId } from '../domain/BedId.js';
import { BedName } from '../domain/BedName.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedPrimitives } from '../domain/entities/types/BedPrimitives.js';
import type { BedDomainMapper } from './interfaces/BedDomainMapper.js';

export const bedDomainMapper: BedDomainMapper = {
  toPrimitives(bed: Bed): BedPrimitives {
    return {
      id: bed.id,
      userId: bed.userId,
      name: bed.name.value,
      width: bed.width.value,
      height: bed.height.value,
      depth: bed.depth.value,
      ...(bed.postalCode !== undefined && { postalCode: bed.postalCode }),
      ...(bed.country !== undefined && { country: bed.country }),
      ...(bed.timezone !== undefined && { timezone: bed.timezone }),
      ...(bed.hemisphere !== undefined && { hemisphere: bed.hemisphere }),
      metadata: bed.metadata.toPrimitives(),
      deleted: bed.isDeleted,
      ...(bed.deletedAt && { deletedAt: bed.deletedAt.toISOString() }),
      version: bed.version
    };
  },

  fromPrimitives(primitives: BedPrimitives): Bed {
    return Bed.create({
      id: createBedId(primitives.id),
      userId: createUserId(primitives.userId),
      name: new BedName(primitives.name),
      width: PositiveNumber.create(primitives.width),
      height: PositiveNumber.create(primitives.height),
      depth: PositiveNumber.create(primitives.depth),
      ...(primitives.postalCode !== undefined && {
        postalCode: primitives.postalCode
      }),
      ...(primitives.country !== undefined && {
        country: primitives.country
      }),
      ...(primitives.timezone !== undefined && {
        timezone: primitives.timezone
      }),
      ...(primitives.hemisphere !== undefined && {
        hemisphere: primitives.hemisphere
      }),
      deleted: primitives.deleted,
      ...(primitives.deletedAt && {
        deletedAt: new Date(primitives.deletedAt)
      }),
      metadata: Metadata.fromPrimitives(primitives.metadata),
      version: primitives.version
    });
  }
};
