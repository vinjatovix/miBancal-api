import { describe, expect, it } from '@jest/globals';
import {
  attachLocations,
  attachLocationToBed
} from '../../../../../../src/Contexts/Agro/Beds/application/useCases/attachLocations.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { LocationRepositoryMock } from '../../../Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../Locations/domain/mothers/LocationFactory.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('attachLocations', () => {
  it('resolves active owned locations and attaches LocationSummary', async () => {
    const userId = randomUserId();
    const location = LocationFactory.domainBase({
      userId,
      name: 'Parcela Norte',
      latitude: 40.4168,
      longitude: -3.7038
    });
    const locationRepository = new LocationRepositoryMock();
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({ userId, locationId: location.id });

    const result = await attachLocations(locationRepository, [bed], userId, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.location).toEqual({
      id: location.id,
      name: 'Parcela Norte',
      latitude: 40.4168,
      longitude: -3.7038
    });
  });

  it('attaches location as null for beds whose location was soft-deleted', async () => {
    const userId = randomUserId();
    const location = LocationFactory.domainBase({
      userId,
      status: 'deleted',
      deletedAt: new Date()
    });
    const locationRepository = new LocationRepositoryMock();
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({ userId, locationId: location.id });

    const result = await attachLocations(locationRepository, [bed], userId, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result[0]?.location).toBeNull();
  });

  it('attaches location as null for beds with locationId null', async () => {
    const userId = randomUserId();
    const locationRepository = new LocationRepositoryMock();
    const bed = BedFactory.create({ userId, locationId: null });

    const result = await attachLocations(locationRepository, [bed], userId, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result[0]?.location).toBeNull();
  });

  it('omits location property when embedLocation is false', async () => {
    const userId = randomUserId();
    const location = LocationFactory.domainBase({ userId });
    const locationRepository = new LocationRepositoryMock();
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({ userId, locationId: location.id });

    const result = await attachLocations(locationRepository, [bed], userId, {
      embedCrops: false,
      embedLocation: false
    });

    expect(result[0]?.location).toBeUndefined();
  });

  it('returns empty array without querying repository when beds array is empty', async () => {
    const userId = randomUserId();
    const locationRepository = new LocationRepositoryMock();

    const result = await attachLocations(locationRepository, [], userId, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result).toEqual([]);
  });

  it('attaches location to a single bed via attachLocationToBed', async () => {
    const userId = randomUserId();
    const location = LocationFactory.domainBase({
      userId,
      name: 'Finca Sur',
      latitude: 41.3879,
      longitude: 2.1699
    });
    const locationRepository = new LocationRepositoryMock();
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({ userId, locationId: location.id });

    const result = await attachLocationToBed(locationRepository, bed, userId, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result.location).toEqual({
      id: location.id,
      name: 'Finca Sur',
      latitude: 41.3879,
      longitude: 2.1699
    });
  });

  it('preserves cropIds when attaching location to BedWithCrops', async () => {
    const userId = randomUserId();
    const location = LocationFactory.domainBase({
      userId,
      name: 'Finca Con Cultivos',
      latitude: 40.4168,
      longitude: -3.7038
    });
    const locationRepository = new LocationRepositoryMock();
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({ userId, locationId: location.id });
    const bedWithCrops = {
      bed,
      cropIds: ['crop-1', 'crop-2']
    };

    const result = await attachLocationToBed(
      locationRepository,
      bedWithCrops,
      userId,
      {
        embedCrops: false,
        embedLocation: true
      }
    );

    expect(result.cropIds).toEqual(['crop-1', 'crop-2']);
    expect(result.location?.name).toBe('Finca Con Cultivos');
  });
});
