import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { LocationRepository } from '../../../Locations/domain/repositories/interfaces/LocationRepository.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedGeographicSnapshot } from '../../domain/entities/types/BedGeographicSnapshot.js';
import type { BedPosition } from '../../domain/entities/types/BedPosition.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { BedCollisionDetector } from '../../domain/services/spatial/BedCollisionDetector.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';
import { bedInputMapper } from '../../mappers/bedInputMapper.js';
import { attachCropsToBed, type BedWithCrops } from './attachCrops.js';
import type { UpdateBedInput } from './interfaces/UpdateBedInput.js';
import { toBedGeographicSnapshot } from './toBedGeographicSnapshot.js';

export type UpdateBedDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
  locationRepository: LocationRepository;
};

export class UpdateBed {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly locationRepository: LocationRepository;

  constructor({
    bedRepository,
    plantInstanceRepository,
    locationRepository
  }: UpdateBedDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.locationRepository = locationRepository;
  }

  async execute(
    input: UpdateBedInput,
    user: UserSessionInfo,
    expectedVersions: readonly number[]
  ): Promise<BedWithCrops> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(input.id, user.id),
      'Bed',
      input.id
    );
    ensureVersion(bed.version, expectedVersions, 'Bed', input.id);

    const changes = bedInputMapper.toChanges(input);
    const before = bedDomainMapper.toPrimitives(bed);
    // One timestamp for the whole request, whatever fields it touches.
    const at = new Date();

    // Only the fields sent are touched: `{}` leaves the bed and its audit data
    // as they are.
    if (changes.name !== undefined) {
      bed.rename(changes.name, user.username, at);
    }
    if (Object.keys(changes.dimensions).length > 0) {
      bed.resize(changes.dimensions, user.username, at);
    }
    if (changes.locationId !== undefined) {
      if (changes.locationId === null) {
        throw new InvalidArgumentException(
          'Bed cannot be unlinked from a location'
        );
      }
      const geo = await this.resolveSnapshot(changes.locationId, user.id);
      bed.relocate(changes.locationId, geo, user.username, at);
    }

    if (changes.position !== undefined || changes.rotation !== undefined) {
      await this.handleSpatialPlacement(bed, changes, user, at);
    }

    const after = bedDomainMapper.toPrimitives(bed);

    // Always called: an empty diff is still confirmed against storage.
    bed.syncVersion(await this.bedRepository.updateWithDiff(before, after));

    return attachCropsToBed(this.plantInstanceRepository, bed, user.id, {
      embedCrops: false
    });
  }

  private async handleSpatialPlacement(
    bed: Bed,
    changes: { position?: { x: number; y: number } | null; rotation?: number },
    user: UserSessionInfo,
    at: Date
  ): Promise<void> {
    if (changes.position === null) {
      bed.unplace(user.username, at);
      await this.tryIncrementLocationVersion(bed.locationId, user.id);
      return;
    }

    const nextPosition = changes.position ?? bed.position;
    const nextRotation = changes.rotation ?? bed.rotation ?? 0;

    if (!nextPosition) {
      throw new InvalidArgumentException(
        'Position must be provided when setting rotation for unplaced bed'
      );
    }

    let canvasNorth: number | undefined;
    if (bed.locationId) {
      canvasNorth = await this.validatePlacementAndBumpLocation(
        bed,
        nextPosition,
        nextRotation,
        user.id
      );
    }

    bed.place(nextPosition, nextRotation, canvasNorth, user.username, at);
  }

  private async tryIncrementLocationVersion(
    locationId: string | null,
    userId: string
  ): Promise<void> {
    if (!locationId) return;
    const location = await this.locationRepository.findOwnedActiveById(
      locationId,
      userId
    );
    if (location) {
      await this.locationRepository.conditionalIncrementVersion(
        location.id,
        location.version
      );
    }
  }

  private async validatePlacementAndBumpLocation(
    bed: Bed,
    position: BedPosition,
    rotation: number,
    userId: string
  ): Promise<number | undefined> {
    if (!bed.locationId) return undefined;
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(bed.locationId, userId),
      'Location',
      bed.locationId
    );

    const targetObb = BedCollisionDetector.getOBB(
      position,
      bed.width.value,
      bed.height.value,
      rotation
    );

    if (
      location.canvasWidth !== undefined &&
      location.canvasHeight !== undefined
    ) {
      if (
        !BedCollisionDetector.checkContainment(
          targetObb,
          location.canvasWidth,
          location.canvasHeight
        )
      ) {
        throw new InvalidArgumentException(
          'Bed placement exceeds location canvas boundaries'
        );
      }
    }

    const siblings = await this.bedRepository.findByUserId(userId, {
      locationId: bed.locationId
    });
    for (const sibling of siblings) {
      if (sibling.id !== bed.id && sibling.position) {
        const siblingObb = BedCollisionDetector.getOBB(
          sibling.position,
          sibling.width.value,
          sibling.height.value,
          sibling.rotation ?? 0
        );
        if (BedCollisionDetector.checkCollision(targetObb, siblingObb)) {
          throw new DomainConflictException(
            `Bed placement collides with existing bed: ${sibling.id}`
          );
        }
      }
    }

    await this.locationRepository.conditionalIncrementVersion(
      location.id,
      location.version
    );
    return location.northAngle;
  }

  private async resolveSnapshot(
    locationId: string,
    userId: string
  ): Promise<BedGeographicSnapshot | null> {
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(locationId, userId),
      'Location',
      locationId
    );

    return toBedGeographicSnapshot(location);
  }
}
