import type { Location } from '../../../../Contexts/Agro/Locations/domain/entities/Location.js';
import type { LocationPrimitives } from '../../../../Contexts/Agro/Locations/domain/entities/types/LocationPrimitives.js';
import { locationDomainMapper } from '../../../../Contexts/Agro/Locations/mappers/locationDomainMapper.js';

export type LocationResponse = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
};

const fromPrimitives = (primitives: LocationPrimitives): LocationResponse => ({
  id: primitives.id,
  name: primitives.name,
  ...(primitives.latitude !== undefined && { latitude: primitives.latitude }),
  ...(primitives.longitude !== undefined && {
    longitude: primitives.longitude
  }),
  createdAt: primitives.metadata.createdAt,
  createdBy: primitives.metadata.createdBy,
  updatedAt: primitives.metadata.updatedAt,
  updatedBy: primitives.metadata.updatedBy
});

/** Never leaks `status` or `deletedAt`. */
export const toLocationResponse = (location: Location): LocationResponse =>
  fromPrimitives(locationDomainMapper.toPrimitives(location));
