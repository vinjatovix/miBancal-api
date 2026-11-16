import type { LocationRepository } from '../../../Locations/domain/repositories/interfaces/LocationRepository.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { BedFilter } from '../../domain/entities/types/BedFilter.js';
import type { BedWithRelations } from '../../domain/entities/types/BedWithRelations.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { attachCrops, type BedReadOptions } from './attachCrops.js';
import { attachLocations } from './attachLocations.js';

export type ListUserBedsDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
  locationRepository: LocationRepository;
};

export class ListUserBeds {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly locationRepository: LocationRepository;

  constructor({
    bedRepository,
    plantInstanceRepository,
    locationRepository
  }: ListUserBedsDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.locationRepository = locationRepository;
  }

  async execute(
    userId: string,
    filter?: BedFilter,
    options?: BedReadOptions
  ): Promise<BedWithRelations[]> {
    const beds = await this.bedRepository.findByUserId(userId, filter);

    const bedsWithCrops = await attachCrops(
      this.plantInstanceRepository,
      beds,
      userId,
      {
        embedCrops: options?.embedCrops === true
      }
    );

    return attachLocations(
      this.locationRepository,
      bedsWithCrops,
      userId,
      options
    );
  }
}
