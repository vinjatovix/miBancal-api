import { createUserId } from '../../../Auth/domain/UserId.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import type { CreateLocationInput } from '../application/useCases/interfaces/CreateLocationInput.js';
import type { UpdateLocationInput } from '../application/useCases/interfaces/UpdateLocationInput.js';
import { Location } from '../domain/entities/Location.js';
import type { LocationChanges } from '../domain/entities/types/LocationChanges.js';
import { createLocationId } from '../domain/LocationId.js';
import type { LocationInputMapper } from './interfaces/LocationInputMapper.js';

export const locationInputMapper: LocationInputMapper = {
  fromCreateInputToDomain(input: CreateLocationInput, user: string): Location {
    return Location.create({
      id: createLocationId(input.id),
      userId: createUserId(input.userId),
      name: input.name,
      ...(input.postalCode !== undefined && {
        postalCode: input.postalCode
      }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.hemisphere !== undefined && {
        hemisphere: input.hemisphere
      }),
      metadata: Metadata.create(user)
    });
  },

  toChanges(input: UpdateLocationInput): LocationChanges {
    return {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.postalCode !== undefined && {
        postalCode: input.postalCode
      }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.hemisphere !== undefined && {
        hemisphere: input.hemisphere
      })
    };
  }
};
