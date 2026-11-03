import type { Location } from '../../../Locations/domain/entities/Location.js';
import type { BedGeographicSnapshot } from '../../domain/entities/types/BedGeographicSnapshot.js';

/**
 * Copies a resolved location's coordinates into a bed snapshot.
 */
export const toBedGeographicSnapshot = (
  location: Location
): BedGeographicSnapshot => ({
  latitude: location.latitude,
  longitude: location.longitude
});
