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
      latitude: input.latitude,
      longitude: input.longitude,
      canvasWidth: input.width ?? input.canvasWidth,
      canvasHeight: input.height ?? input.canvasHeight,
      northAngle: input.northAngle,
      metadata: Metadata.create(user)
    });
  },

  toChanges(input: UpdateLocationInput): LocationChanges {
    const changes: LocationChanges = {};

    if (input.name !== undefined) changes.name = input.name;
    if (input.latitude !== undefined) changes.latitude = input.latitude;
    if (input.longitude !== undefined) changes.longitude = input.longitude;

    const width = input.width ?? input.canvasWidth;
    if (width !== undefined) changes.canvasWidth = width;

    const height = input.height ?? input.canvasHeight;
    if (height !== undefined) changes.canvasHeight = height;

    if (input.northAngle !== undefined) changes.northAngle = input.northAngle;

    return changes;
  }
};
