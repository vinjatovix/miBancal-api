import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Bed } from '../../../Beds/domain/entities/Bed.js';
import type { BedRepository } from '../../../Beds/domain/repositories/interfaces/BedRepository.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';

export type GetLocationByIdDependencies = {
  locationRepository: LocationRepository;
  bedRepository?: BedRepository | undefined;
};

export type GetLocationByIdResult = {
  location: Location;
  beds?: Bed[] | undefined;
};

export class GetLocationById {
  private readonly locationRepository: LocationRepository;
  private readonly bedRepository: BedRepository | undefined;

  constructor({
    locationRepository,
    bedRepository
  }: GetLocationByIdDependencies) {
    this.locationRepository = locationRepository;
    this.bedRepository = bedRepository;
  }

  async execute(
    id: string,
    userId: string,
    include?: string
  ): Promise<GetLocationByIdResult> {
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(id, userId),
      'Location',
      id
    );

    if (include === 'beds') {
      const beds = this.bedRepository
        ? await this.bedRepository.findByUserId(userId, { locationId: id })
        : [];
      return { location, beds };
    }

    return { location };
  }
}
