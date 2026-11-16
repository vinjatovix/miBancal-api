import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationFilter } from '../../domain/entities/types/LocationFilter.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';

export type ListUserLocationsDependencies = {
  locationRepository: LocationRepository;
};

export class ListUserLocations {
  private readonly locationRepository: LocationRepository;

  constructor({ locationRepository }: ListUserLocationsDependencies) {
    this.locationRepository = locationRepository;
  }

  async execute(
    userId: string,
    options: Omit<QueryOptions<LocationFilter>, 'filter'> = {}
  ): Promise<PaginatedResult<Location>> {
    // Owner scoping is never client-settable: `userId` always wins over any
    // filter the request could otherwise carry.
    return this.locationRepository.findAll({
      ...options,
      filter: { userId: { eq: userId } }
    });
  }
}
