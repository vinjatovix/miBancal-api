import type { Location } from '../../../Locations/domain/entities/Location.js';
import type { LocationRepository } from '../../../Locations/domain/repositories/interfaces/LocationRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedWithRelations } from '../../domain/entities/types/BedWithRelations.js';
import type { LocationSummary } from '../../domain/entities/types/LocationSummary.js';
import type { BedReadOptions, BedWithCrops } from './attachCrops.js';

export const toLocationSummary = (location: Location): LocationSummary => ({
  id: location.id,
  name: location.name,
  latitude: location.latitude ?? null,
  longitude: location.longitude ?? null
});

type LocatableItem = Bed | BedWithCrops;

const toBedWithCrops = (item: LocatableItem): BedWithCrops => {
  if ('cropIds' in item) {
    return item;
  }
  return {
    bed: item,
    cropIds: []
  };
};

export const attachLocations = async (
  locationRepository: LocationRepository,
  items: readonly LocatableItem[],
  userId: string,
  options?: BedReadOptions
): Promise<BedWithRelations[]> => {
  if (items.length === 0) return [];

  const bedsWithCrops = items.map(toBedWithCrops);

  if (!options?.embedLocation) {
    return bedsWithCrops.map((item) => ({ ...item }));
  }

  const locationIds = Array.from(
    new Set(
      bedsWithCrops
        .map((item) => item.bed.locationId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  const activeLocations =
    locationIds.length > 0
      ? await locationRepository.findActiveByIdsForOwner(locationIds, userId)
      : [];

  const locationMap = new Map<string, LocationSummary>(
    activeLocations.map((loc) => [loc.id, toLocationSummary(loc)])
  );

  return bedsWithCrops.map((item) => {
    const locId = item.bed.locationId;
    const location = locId ? (locationMap.get(locId) ?? null) : null;

    return {
      ...item,
      location
    };
  });
};

export const attachLocationToBed = async (
  locationRepository: LocationRepository,
  item: LocatableItem,
  userId: string,
  options?: BedReadOptions
): Promise<BedWithRelations> => {
  const [result] = await attachLocations(
    locationRepository,
    [item],
    userId,
    options
  );

  return result!;
};
