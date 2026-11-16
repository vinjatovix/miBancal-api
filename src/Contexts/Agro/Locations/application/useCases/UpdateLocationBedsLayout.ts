import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import {
  DomainNotFoundException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { Bed } from '../../../Beds/domain/entities/Bed.js';
import type { BedPosition } from '../../../Beds/domain/entities/types/BedPosition.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import { BedCollisionDetector } from '../../../Beds/domain/services/spatial/BedCollisionDetector.js';
import type { OrientedBoundingBox } from '../../../Beds/domain/services/types/OrientedBoundingBox.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';
import type {
  BedLayoutPlacementItem,
  UpdateLocationBedsLayoutInput
} from './types/UpdateLocationBedsLayoutDto.js';

export type UpdateLocationBedsLayoutDependencies = {
  locationRepository: LocationRepository;
  bedRepository: BedRepository;
};

type EffectiveBedPlacement = {
  bed: Bed;
  position: BedPosition | undefined;
  rotation: number;
};

export class UpdateLocationBedsLayout {
  private readonly locationRepository: LocationRepository;
  private readonly bedRepository: BedRepository;

  constructor({
    locationRepository,
    bedRepository
  }: UpdateLocationBedsLayoutDependencies) {
    this.locationRepository = locationRepository;
    this.bedRepository = bedRepository;
  }

  async execute(
    input: UpdateLocationBedsLayoutInput,
    user: UserSessionInfo,
    expectedVersions: readonly number[]
  ): Promise<Location> {
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(
        input.locationId,
        input.userId
      ),
      'Location',
      input.locationId
    );

    ensureVersion(
      location.version,
      expectedVersions,
      'Location',
      input.locationId
    );

    const allLocationBeds = await this.bedRepository.findByUserId(
      input.userId,
      { locationId: input.locationId }
    );
    const bedsById = new Map(allLocationBeds.map((bed) => [bed.id, bed]));

    this.assertAllLayoutBedsExist(input.layouts, bedsById);

    const effectivePlacements = this.buildEffectivePlacements(
      allLocationBeds,
      input.layouts
    );

    this.validateNoCollisions(effectivePlacements);

    const at = new Date();
    const modifiedBeds = this.applyLayoutMutations(
      input.layouts,
      bedsById,
      location.northAngle,
      user.username,
      at
    );

    await this.bedRepository.updateLayouts(modifiedBeds);
    await this.locationRepository.conditionalIncrementVersion(
      location.id,
      location.version
    );
    location.syncVersion('written');

    return location;
  }

  private assertAllLayoutBedsExist(
    layouts: readonly BedLayoutPlacementItem[],
    bedsById: Map<string, Bed>
  ): void {
    const seenIds = new Set<string>();
    for (const layout of layouts) {
      if (seenIds.has(layout.id)) {
        throw new InvalidArgumentException(
          `Duplicate bed id in layout update: ${layout.id}`
        );
      }
      seenIds.add(layout.id);
      if (!bedsById.has(layout.id)) {
        throw new DomainNotFoundException(`Bed not found: ${layout.id}`);
      }
    }
  }

  private buildEffectivePlacements(
    allBeds: readonly Bed[],
    layouts: readonly BedLayoutPlacementItem[]
  ): EffectiveBedPlacement[] {
    const layoutMap = new Map(layouts.map((item) => [item.id, item]));

    return allBeds.map((bed) => {
      const layout = layoutMap.get(bed.id);
      if (layout === undefined) {
        return {
          bed,
          position: bed.position,
          rotation: bed.rotation ?? 0
        };
      }

      if (layout.position === null) {
        return {
          bed,
          position: undefined,
          rotation: 0
        };
      }

      return {
        bed,
        position: layout.position,
        rotation: layout.rotation ?? bed.rotation ?? 0
      };
    });
  }

  private validateNoCollisions(
    placements: readonly EffectiveBedPlacement[]
  ): void {
    const placedWithObb: { id: string; obb: OrientedBoundingBox }[] = [];

    for (const placement of placements) {
      if (placement.position === undefined) continue;

      const obb = BedCollisionDetector.getOBB(
        placement.position,
        placement.bed.width.value,
        placement.bed.height.value,
        placement.rotation
      );
      placedWithObb.push({ id: placement.bed.id, obb });
    }

    for (let i = 0; i < placedWithObb.length; i += 1) {
      const first = placedWithObb[i];
      if (!first) continue;

      for (let j = i + 1; j < placedWithObb.length; j += 1) {
        const second = placedWithObb[j];
        if (!second) continue;

        if (BedCollisionDetector.checkCollision(first.obb, second.obb)) {
          throw new InvalidArgumentException(
            `Bed collision detected between beds: ${first.id} and ${second.id}`
          );
        }
      }
    }
  }

  private applyLayoutMutations(
    layouts: readonly BedLayoutPlacementItem[],
    bedsById: Map<string, Bed>,
    northAngle: number | undefined,
    actor: string,
    at: Date
  ): Bed[] {
    const modifiedBeds: Bed[] = [];

    for (const layout of layouts) {
      const bed = bedsById.get(layout.id);
      if (!bed) continue;

      if (layout.position === null) {
        bed.unplace(actor, at);
      } else {
        const rotation = layout.rotation ?? bed.rotation ?? 0;
        bed.place(layout.position, rotation, northAngle, actor, at);
      }

      modifiedBeds.push(bed);
    }

    return modifiedBeds;
  }
}
