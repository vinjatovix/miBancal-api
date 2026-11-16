import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { LocationRepository } from '../../../Locations/domain/repositories/interfaces/LocationRepository.js';
import type { PlantInstanceRepository } from '../../../PlantInstances/domain/repositories/interfaces/PlantInstanceRepository.js';
import type { BedWithRelations } from '../../domain/entities/types/BedWithRelations.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { attachCropsToBed, type BedReadOptions } from './attachCrops.js';
import { attachLocationToBed } from './attachLocations.js';

export type GetBedByIdDependencies = {
  bedRepository: BedRepository;
  plantInstanceRepository: PlantInstanceRepository;
  locationRepository: LocationRepository;
};

export class GetBedById {
  private readonly bedRepository: BedRepository;
  private readonly plantInstanceRepository: PlantInstanceRepository;
  private readonly locationRepository: LocationRepository;

  constructor({
    bedRepository,
    plantInstanceRepository,
    locationRepository
  }: GetBedByIdDependencies) {
    this.bedRepository = bedRepository;
    this.plantInstanceRepository = plantInstanceRepository;
    this.locationRepository = locationRepository;
  }

  async execute(
    id: string,
    user: UserSessionInfo,
    options?: BedReadOptions
  ): Promise<BedWithRelations> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );

    const bedWithCrops = await attachCropsToBed(
      this.plantInstanceRepository,
      bed,
      user.id,
      {
        embedCrops: options?.embedCrops === true
      }
    );

    if (!options?.embedLocation) {
      return bedWithCrops;
    }

    return attachLocationToBed(
      this.locationRepository,
      bedWithCrops,
      user.id,
      options
    );
  }
}
