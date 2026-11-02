import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';

export type GetLocationByIdDependencies = {
  locationRepository: LocationRepository;
};

export class GetLocationById {
  private readonly locationRepository: LocationRepository;

  constructor({ locationRepository }: GetLocationByIdDependencies) {
    this.locationRepository = locationRepository;
  }

  async execute(id: string, userId: string): Promise<Location> {
    return ensureFound(
      await this.locationRepository.findOwnedActiveById(id, userId),
      'Location',
      id
    );
  }
}
