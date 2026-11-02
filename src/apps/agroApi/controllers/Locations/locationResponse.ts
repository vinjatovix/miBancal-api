import type { Location } from '../../../../Contexts/Agro/Locations/domain/entities/Location.js';
import type { LocationPrimitives } from '../../../../Contexts/Agro/Locations/domain/entities/types/LocationPrimitives.js';
import { locationDomainMapper } from '../../../../Contexts/Agro/Locations/mappers/locationDomainMapper.js';

export type LocationResponse = {
  id: string;
  name: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  hemisphere?: 'north' | 'south';
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
};

const fromPrimitives = (primitives: LocationPrimitives): LocationResponse => ({
  id: primitives.id,
  name: primitives.name,
  ...(primitives.postalCode !== undefined && {
    postalCode: primitives.postalCode
  }),
  ...(primitives.country !== undefined && { country: primitives.country }),
  ...(primitives.timezone !== undefined && {
    timezone: primitives.timezone
  }),
  ...(primitives.hemisphere !== undefined && {
    hemisphere: primitives.hemisphere
  }),
  createdAt: primitives.metadata.createdAt,
  createdBy: primitives.metadata.createdBy,
  updatedAt: primitives.metadata.updatedAt,
  updatedBy: primitives.metadata.updatedBy
});

/** Never leaks `status` or `deletedAt`; absent geographic fields stay absent. */
export const toLocationResponse = (location: Location): LocationResponse =>
  fromPrimitives(locationDomainMapper.toPrimitives(location));
