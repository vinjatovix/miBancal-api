import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { EventBus } from '../../../../shared/application/eventBus/index.js';
import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { BedRepository } from '../../domain/repositories/interfaces/BedRepository.js';
import { bedDomainMapper } from '../../mappers/bedDomainMapper.js';

export type DeleteBedDependencies = {
  bedRepository: BedRepository;
  eventBus: EventBus;
  unitOfWork: UnitOfWork;
};

export class DeleteBed {
  private readonly bedRepository: BedRepository;
  private readonly eventBus: EventBus;
  private readonly unitOfWork: UnitOfWork;

  constructor({ bedRepository, eventBus, unitOfWork }: DeleteBedDependencies) {
    this.bedRepository = bedRepository;
    this.eventBus = eventBus;
    this.unitOfWork = unitOfWork;
  }

  async execute(
    id: string,
    user: UserSessionInfo,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const bed = ensureFound(
      await this.bedRepository.findOwnedActiveById(id, user.id),
      'Bed',
      id
    );
    ensureVersion(bed.version, expectedVersions, 'Bed', id);

    const current = bedDomainMapper.toPrimitives(bed);
    const at = new Date();
    bed.markAsDeleted(user.username, at);
    const deleted = bedDomainMapper.toPrimitives(bed);

    // Pulled before `run` because the unit of work may retry its callback; a
    // second attempt would drain an empty buffer and commit the deletion with
    // no events.
    const events = bed.pullDomainEvents();

    await this.unitOfWork.run(async () => {
      await this.bedRepository.updateWithDiff(current, deleted);
      await this.eventBus.publish(events);
    });
  }
}
