import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';
import { locationInputMapper } from '../../mappers/locationInputMapper.js';
import type { CreateLocationInput } from './interfaces/CreateLocationInput.js';

export type CreateLocationDependencies = {
  locationRepository: LocationRepository;
};

export class CreateLocation {
  private readonly locationRepository: LocationRepository;

  constructor({ locationRepository }: CreateLocationDependencies) {
    this.locationRepository = locationRepository;
  }

  async execute(input: CreateLocationInput, user: string): Promise<Location> {
    const existing = await this.locationRepository.findActiveByNameForOwner(
      input.userId,
      input.name
    );

    if (existing !== null) {
      throw new DomainConflictException(
        `Location name already in use: ${input.name}`
      );
    }

    const location = locationInputMapper.fromCreateInputToDomain(input, user);

    await this.locationRepository.create(location);

    return location;
  }
}
