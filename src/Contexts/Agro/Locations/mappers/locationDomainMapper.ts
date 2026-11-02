import { createUserId } from '../../../Auth/domain/UserId.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import { Location } from '../domain/entities/Location.js';
import type { LocationPrimitives } from '../domain/entities/types/LocationPrimitives.js';
import { createLocationId } from '../domain/LocationId.js';
import type { LocationDomainMapper } from './interfaces/LocationDomainMapper.js';

export const locationDomainMapper: LocationDomainMapper = {
  toPrimitives(location: Location): LocationPrimitives {
    return {
      id: location.id,
      userId: location.userId,
      name: location.name,
      ...(location.postalCode !== undefined && {
        postalCode: location.postalCode
      }),
      ...(location.country !== undefined && { country: location.country }),
      ...(location.timezone !== undefined && {
        timezone: location.timezone
      }),
      ...(location.hemisphere !== undefined && {
        hemisphere: location.hemisphere
      }),
      status: location.status,
      ...(location.deletedAt && {
        deletedAt: location.deletedAt.toISOString()
      }),
      metadata: location.metadata.toPrimitives(),
      version: location.version
    };
  },

  fromPrimitives(primitives: LocationPrimitives): Location {
    return Location.create({
      id: createLocationId(primitives.id),
      userId: createUserId(primitives.userId),
      name: primitives.name,
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
      status: primitives.status,
      ...(primitives.deletedAt !== undefined && {
        deletedAt: new Date(primitives.deletedAt)
      }),
      metadata: Metadata.fromPrimitives(primitives.metadata),
      version: primitives.version
    });
  }
};
