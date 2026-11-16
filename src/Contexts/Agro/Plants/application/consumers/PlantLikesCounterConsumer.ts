import type { UnitOfWork } from '../../../../shared/application/interfaces/index.js';
import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type {
  KafkaDomainEventEnvelope,
  ProcessedEventsRepository
} from '../../../../shared/domain/events/index.js';
import type { AppLogger } from '../../../../shared/plugins/index.js';
import type { PlantLikesCounterRepository } from '../../domain/repositories/interfaces/PlantLikesCounterRepository.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';

export type PlantLikesCounterConsumerDependencies = {
  processedEventsRepository: ProcessedEventsRepository;
  plantLikesCounterRepository: PlantLikesCounterRepository;
  plantRepository: PlantRepository;
  unitOfWork: UnitOfWork;
  logger: AppLogger;
};

const SUPPORTED_EVENTS = new Set(['plant.liked', 'plant.unliked']);

export class PlantLikesCounterConsumer {
  private readonly processedEventsRepository: ProcessedEventsRepository;
  private readonly plantLikesCounterRepository: PlantLikesCounterRepository;
  private readonly plantRepository: PlantRepository;
  private readonly unitOfWork: UnitOfWork;
  private readonly logger: AppLogger;

  constructor({
    processedEventsRepository,
    plantLikesCounterRepository,
    plantRepository,
    unitOfWork,
    logger
  }: PlantLikesCounterConsumerDependencies) {
    this.processedEventsRepository = processedEventsRepository;
    this.plantLikesCounterRepository = plantLikesCounterRepository;
    this.plantRepository = plantRepository;
    this.unitOfWork = unitOfWork;
    this.logger = logger;
  }

  public async handle(envelope: KafkaDomainEventEnvelope): Promise<void> {
    const { eventId, eventName, aggregateId, occurredAt, payload } = envelope;

    if (!SUPPORTED_EVENTS.has(eventName)) {
      this.logger.debug('Domain event ignored by consumer', {
        eventId,
        eventName
      });
      return;
    }

    const alreadyProcessed = await this.processedEventsRepository.has(eventId);
    if (alreadyProcessed) {
      this.logger.info('Duplicate domain event skipped', {
        eventId,
        eventName,
        aggregateId
      });
      return;
    }

    const plantId = payload.plantId ?? aggregateId;
    const processedAt = occurredAt ? new Date(occurredAt) : new Date();

    try {
      await this.unitOfWork.run(async () => {
        await this.processedEventsRepository.claim(eventId, processedAt);

        const plantExists = await this.plantRepository.exists(plantId);
        if (!plantExists) {
          this.logger.info(
            'Domain event target plant not found; acknowledged without counter update',
            {
              eventId,
              eventName,
              plantId
            }
          );
          return;
        }

        if (eventName === 'plant.liked') {
          await this.plantLikesCounterRepository.increment(plantId);
        } else if (eventName === 'plant.unliked') {
          await this.plantLikesCounterRepository.decrement(plantId);
        }
      });

      this.logger.info('Domain event applied', {
        eventId,
        eventName,
        aggregateId
      });
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        this.logger.info('Duplicate domain event skipped', {
          eventId,
          eventName,
          aggregateId
        });
        return;
      }

      this.logger.error('Domain event processing failed', error, {
        eventId,
        eventName,
        aggregateId
      });
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (error instanceof DomainConflictException) {
      return true;
    }

    if (typeof error === 'object' && error !== null) {
      const err = error as { code?: number; message?: string };
      if (err.code === 11000) {
        return true;
      }
      if (
        typeof err.message === 'string' &&
        (err.message.includes('E11000') || err.message.includes('Duplicate'))
      ) {
        return true;
      }
    }

    return false;
  }
}
