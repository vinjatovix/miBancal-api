import type { Location } from '../../../Locations/domain/entities/Location.js';
import type { BedGeographicSnapshot } from '../../domain/entities/types/BedGeographicSnapshot.js';

/**
 * Copies a resolved location's coordinates into a bed snapshot,
 * or returns null if the location has no coordinates.
 */
export const toBedGeographicSnapshot = (
  location: Location
): BedGeographicSnapshot | null => {
  if (location.latitude === undefined || location.longitude === undefined) {
    return null;
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude
  };
};
