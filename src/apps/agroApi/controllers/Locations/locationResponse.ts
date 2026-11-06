import type { Bed } from '../../../../Contexts/Agro/Beds/domain/entities/Bed.js';
import type { Location } from '../../../../Contexts/Agro/Locations/domain/entities/Location.js';
import type { LocationPrimitives } from '../../../../Contexts/Agro/Locations/domain/entities/types/LocationPrimitives.js';
import { locationDomainMapper } from '../../../../Contexts/Agro/Locations/mappers/locationDomainMapper.js';

export type LocationBedSummaryResponse = {
  id: string;
  name: string;
  width: number;
  height: number;
  depth: number;
  position?: { x: number; y: number } | null;
  rotation?: number;
  netOrientation?: number;
};

export type LocationResponse = {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  width?: number;
  height?: number;
  northAngle?: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  beds?: LocationBedSummaryResponse[];
};

const toBedSummary = (bed: Bed): LocationBedSummaryResponse => ({
  id: bed.id,
  name: bed.name.value,
  width: bed.width.value,
  height: bed.height.value,
  depth: bed.depth.value,
  position: bed.position ?? null,
  rotation: bed.rotation ?? 0,
  ...(bed.netOrientation !== undefined && {
    netOrientation: bed.netOrientation
  })
});

const fromPrimitives = (
  primitives: LocationPrimitives,
  beds?: readonly Bed[]
): LocationResponse => ({
  id: primitives.id,
  name: primitives.name,
  ...(primitives.latitude !== undefined && { latitude: primitives.latitude }),
  ...(primitives.longitude !== undefined && {
    longitude: primitives.longitude
  }),
  ...(primitives.canvasWidth !== undefined && {
    width: primitives.canvasWidth
  }),
  ...(primitives.canvasHeight !== undefined && {
    height: primitives.canvasHeight
  }),
  ...(primitives.northAngle !== undefined && {
    northAngle: primitives.northAngle
  }),
  createdAt: primitives.metadata.createdAt,
  createdBy: primitives.metadata.createdBy,
  updatedAt: primitives.metadata.updatedAt,
  updatedBy: primitives.metadata.updatedBy,
  ...(beds !== undefined && { beds: beds.map(toBedSummary) })
});

/** Never leaks `status` or `deletedAt`. */
export const toLocationResponse = (
  location: Location,
  beds?: readonly Bed[]
): LocationResponse =>
  fromPrimitives(locationDomainMapper.toPrimitives(location), beds);
