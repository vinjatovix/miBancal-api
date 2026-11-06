import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationChanges } from '../../domain/entities/types/LocationChanges.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';
import { locationDomainMapper } from '../../mappers/locationDomainMapper.js';
import { locationInputMapper } from '../../mappers/locationInputMapper.js';
import type { UpdateLocationInput } from './interfaces/UpdateLocationInput.js';

export type UpdateLocationDependencies = {
  locationRepository: LocationRepository;
};

export class UpdateLocation {
  private readonly locationRepository: LocationRepository;

  constructor({ locationRepository }: UpdateLocationDependencies) {
    this.locationRepository = locationRepository;
  }

  async execute(
    input: UpdateLocationInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<Location> {
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(input.id, input.userId),
      'Location',
      input.id
    );

    ensureVersion(location.version, expectedVersions, 'Location', input.id);

    if (input.name !== undefined && input.name.trim() !== location.name) {
      await this.ensureNameIsFree(input.userId, input.name, location.id);
    }

    const changes = locationInputMapper.toChanges(input);
    const before = locationDomainMapper.toPrimitives(location);
    const at = new Date();

    if (changes.name !== undefined) {
      location.rename(changes.name, user, at);
    }

    this.applySpatialChanges(location, changes, user, at);
    this.applyCoordinateChanges(
      location,
      changes.latitude,
      changes.longitude,
      user,
      at
    );

    const after = locationDomainMapper.toPrimitives(location);

    location.syncVersion(
      await this.locationRepository.updateWithDiff(before, after)
    );

    return location;
  }

  private applySpatialChanges(
    location: Location,
    changes: LocationChanges,
    user: string,
    at: Date
  ): void {
    if (
      changes.canvasWidth !== undefined ||
      changes.canvasHeight !== undefined ||
      changes.northAngle !== undefined
    ) {
      location.updateSpatialCanvas(
        {
          ...(changes.canvasWidth !== undefined && {
            canvasWidth: changes.canvasWidth
          }),
          ...(changes.canvasHeight !== undefined && {
            canvasHeight: changes.canvasHeight
          }),
          ...(changes.northAngle !== undefined && {
            northAngle: changes.northAngle
          })
        },
        user,
        at
      );
    }
  }

  private applyCoordinateChanges(
    location: Location,
    latitude: number | null | undefined,
    longitude: number | null | undefined,
    user: string,
    at: Date
  ): void {
    if (latitude === undefined && longitude === undefined) {
      return;
    }
    if (latitude === undefined || longitude === undefined) {
      throw new InvalidArgumentException(
        'Both latitude and longitude must be provided together'
      );
    }
    location.updateCoordinates({ latitude, longitude }, user, at);
  }

  private async ensureNameIsFree(
    userId: string,
    name: string,
    ownId: string
  ): Promise<void> {
    const duplicate = await this.locationRepository.findActiveByNameForOwner(
      userId,
      name
    );

    if (duplicate !== null && duplicate.id !== ownId) {
      throw new DomainConflictException(
        `Location name already in use: ${name}`
      );
    }
  }
}
