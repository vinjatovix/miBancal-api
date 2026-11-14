import { BedDeleted } from '../../../Beds/domain/events/index.js';
import type { PlantInstanceRepository } from '../../domain/repositories/interfaces/PlantInstanceRepository.js';

export type RemoveCropsOnBedDeletedDependencies = {
  plantInstanceRepository: PlantInstanceRepository;
};

export class RemoveCropsOnBedDeleted {
  private readonly plantInstanceRepository: PlantInstanceRepository;

  constructor({
    plantInstanceRepository
  }: RemoveCropsOnBedDeletedDependencies) {
    this.plantInstanceRepository = plantInstanceRepository;
  }

  async handle(event: BedDeleted): Promise<void> {
    await this.plantInstanceRepository.markAllInBedAsRemoved(
      event.payload.bedId,
      event.payload.ownerId,
      new Date(event.payload.occurredAt),
      event.payload.deletedBy
    );
  }
}
