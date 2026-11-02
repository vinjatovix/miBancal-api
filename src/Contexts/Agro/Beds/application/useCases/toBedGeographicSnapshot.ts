import type { Location } from '../../../Locations/domain/entities/Location.js';
import type { BedGeographicSnapshot } from '../../domain/entities/types/BedGeographicSnapshot.js';

/**
 * Copies a resolved location's provided geographic fields into a bed
 * snapshot. Fields the location does not carry stay absent (no synthetic
 * defaults), so the bed only freezes what the location actually holds.
 */
export const toBedGeographicSnapshot = (
  location: Location
): BedGeographicSnapshot => ({
  ...(location.postalCode !== undefined && {
    postalCode: location.postalCode
  }),
  ...(location.country !== undefined && { country: location.country }),
  ...(location.timezone !== undefined && { timezone: location.timezone }),
  ...(location.hemisphere !== undefined && { hemisphere: location.hemisphere })
});
