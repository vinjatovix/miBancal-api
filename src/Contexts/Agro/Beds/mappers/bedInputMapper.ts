import { createUserId } from '../../../Auth/domain/UserId.js';
import {
  Metadata,
  PositiveNumber
} from '../../../shared/domain/valueObject/index.js';
import type { CreateBedInput } from '../application/useCases/interfaces/CreateBedInput.js';
import type { UpdateBedInput } from '../application/useCases/interfaces/UpdateBedInput.js';
import { createBedId } from '../domain/BedId.js';
import { BedName } from '../domain/BedName.js';
import { Bed } from '../domain/entities/Bed.js';
import type { BedChanges } from '../domain/entities/types/BedChanges.js';
import type { BedDimensionsChanges } from '../domain/entities/types/BedDimensionsChanges.js';
import type {
  BedGeographicSnapshot,
  BedInputMapper
} from './interfaces/BedInputMapper.js';

export const bedInputMapper: BedInputMapper = {
  fromCreateInputToDomain(
    input: CreateBedInput,
    user: string,
    geo?: BedGeographicSnapshot
  ): Bed {
    return Bed.create({
      id: createBedId(input.id),
      userId: createUserId(input.userId),
      name: new BedName(input.name),
      width: PositiveNumber.create(input.width),
      height: PositiveNumber.create(input.height),
      depth: PositiveNumber.create(input.depth),
      ...(geo?.postalCode !== undefined && { postalCode: geo.postalCode }),
      ...(geo?.country !== undefined && { country: geo.country }),
      ...(geo?.timezone !== undefined && { timezone: geo.timezone }),
      ...(geo?.hemisphere !== undefined && { hemisphere: geo.hemisphere }),
      metadata: Metadata.create(user),
      deleted: false
    });
  },

  toChanges(input: UpdateBedInput): BedChanges {
    const dimensions: BedDimensionsChanges = {
      ...(input.width !== undefined && { width: input.width }),
      ...(input.height !== undefined && { height: input.height }),
      ...(input.depth !== undefined && { depth: input.depth })
    };

    return {
      ...(input.name !== undefined && { name: input.name }),
      dimensions,
      ...(input.locationId !== undefined && { locationId: input.locationId })
    };
  }
};
