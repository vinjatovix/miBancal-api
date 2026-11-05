import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { LocationRepository } from '../../../Locations/domain/repositories/interfaces/LocationRepository.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedInputMapper } from '../../mappers/bedInputMapper.js';
import type { BedGeographicSnapshot } from '../../mappers/interfaces/BedInputMapper.js';
import type { CreateBedInput } from './interfaces/CreateBedInput.js';
import { toBedGeographicSnapshot } from './toBedGeographicSnapshot.js';

export type CreateBedDependencies = {
  bedRepository: BedRepository;
  locationRepository: LocationRepository;
};

export class CreateBed {
  private readonly bedRepository: BedRepository;
  private readonly locationRepository: LocationRepository;

  constructor({ bedRepository, locationRepository }: CreateBedDependencies) {
    this.bedRepository = bedRepository;
    this.locationRepository = locationRepository;
  }

  async execute(dtoWithUserId: CreateBedInput, user: string): Promise<Bed> {
    if (!dtoWithUserId.locationId) {
      throw new InvalidArgumentException('Bed.locationId is required');
    }

    const exists = await this.bedRepository.exists(dtoWithUserId.id);

    if (exists) {
      throw new DomainConflictException(
        `Bed already exists: ${dtoWithUserId.id}`
      );
    }

    const geoSnapshot = await this.resolveGeoSnapshot(dtoWithUserId);

    const bed = bedInputMapper.fromCreateInputToDomain(
      dtoWithUserId,
      user,
      geoSnapshot
    );

    await this.bedRepository.save(bed);

    return bed;
  }

  private async resolveGeoSnapshot(
    dtoWithUserId: CreateBedInput
  ): Promise<BedGeographicSnapshot | undefined> {
    const location = ensureFound(
      await this.locationRepository.findOwnedActiveById(
        dtoWithUserId.locationId,
        dtoWithUserId.userId
      ),
      'Location',
      dtoWithUserId.locationId
    );

    return toBedGeographicSnapshot(location) ?? undefined;
  }
}
