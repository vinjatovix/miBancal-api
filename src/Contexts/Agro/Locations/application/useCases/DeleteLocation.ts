import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';
import { locationDomainMapper } from '../../mappers/locationDomainMapper.js';

export type DeleteLocationDependencies = {
  locationRepository: LocationRepository;
};

export class DeleteLocation {
  private readonly locationRepository: LocationRepository;

  constructor({ locationRepository }: DeleteLocationDependencies) {
    this.locationRepository = locationRepository;
  }

  async execute(
    id: string,
    userId: string,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(id, userId),
      'Location',
      id
    );

    ensureVersion(location.version, expectedVersions, 'Location', id);

    const before = locationDomainMapper.toPrimitives(location);
    location.markAsDeleted(user, new Date());
    const after = locationDomainMapper.toPrimitives(location);

    await this.locationRepository.updateWithDiff(before, after);
  }
}
