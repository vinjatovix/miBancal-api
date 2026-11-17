import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

import { PlantLikesCounterConsumer } from '../../../../../../src/Contexts/Agro/Plants/application/consumers/PlantLikesCounterConsumer.js';
import type { PlantLikesCounterRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import type { PlantRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import type { UnitOfWork } from '../../../../../../src/Contexts/shared/application/interfaces/index.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import type {
  KafkaDomainEventEnvelope,
  ProcessedEventsRepository
} from '../../../../../../src/Contexts/shared/domain/events/index.js';
import type { AppLogger } from '../../../../../../src/Contexts/shared/plugins/index.js';

describe('PlantLikesCounterConsumer', () => {
  const claim = jest.fn().mockResolvedValue(undefined);
  const has = jest.fn().mockResolvedValue(false);
  const count = jest.fn().mockResolvedValue(0);

  const increment = jest.fn().mockResolvedValue(undefined);
  const decrement = jest.fn().mockResolvedValue(undefined);
  const getLikesCount = jest.fn().mockResolvedValue(0);
  const getLikesCounts = jest.fn().mockResolvedValue(new Map());

  const exists = jest.fn().mockResolvedValue(true);

  const run = jest
    .fn()
    .mockImplementation((operation: () => Promise<unknown>) => operation());

  const debug = jest.fn();
  const info = jest.fn();
  const warn = jest.fn();
  const error = jest.fn();

  let consumer: PlantLikesCounterConsumer;

  beforeEach(() => {
    jest.clearAllMocks();

    claim.mockResolvedValue(undefined);
    has.mockResolvedValue(false);
    count.mockResolvedValue(0);

    increment.mockResolvedValue(undefined);
    decrement.mockResolvedValue(undefined);
    getLikesCount.mockResolvedValue(0);
    getLikesCounts.mockResolvedValue(new Map());

    exists.mockResolvedValue(true);

    run.mockImplementation((operation: () => Promise<unknown>) => operation());

    const processedEventsRepository: ProcessedEventsRepository = {
      claim,
      has,
      count
    };

    const plantLikesCounterRepository: PlantLikesCounterRepository = {
      increment,
      decrement,
      getLikesCount,
      getLikesCounts
    };

    const plantRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findActiveById: jest.fn(),
      save: jest.fn(),
      updateWithDiff: jest.fn(),
      findAll: jest.fn(),
      exists
    } as unknown as PlantRepository;

    const unitOfWork: UnitOfWork = {
      run
    };

    const logger: AppLogger = {
      debug,
      info,
      warn,
      error
    };

    consumer = new PlantLikesCounterConsumer({
      processedEventsRepository,
      plantLikesCounterRepository,
      plantRepository,
      unitOfWork,
      logger
    });
  });

  const buildEnvelope = (
    eventName: string,
    plantId: string = uuidv4(),
    eventId: string = uuidv7()
  ): KafkaDomainEventEnvelope => ({
    eventId,
    eventName,
    aggregateId: plantId,
    occurredAt: new Date().toISOString(),
    payload: {
      plantId,
      userId: uuidv4(),
      likedAt: new Date().toISOString()
    }
  });

  describe('User Story 1: Duplicate delivery protection', () => {
    it('applies increment and claims event id for a new plant.liked event', async () => {
      const plantId = uuidv4();
      const envelope = buildEnvelope('plant.liked', plantId);

      await consumer.handle(envelope);

      expect(run).toHaveBeenCalledTimes(1);
      expect(claim).toHaveBeenCalledWith(
        'plant-likes-counter',
        envelope.eventId,
        expect.any(Date)
      );
      expect(increment).toHaveBeenCalledWith(plantId);
      expect(info).toHaveBeenCalledWith(
        'Domain event applied',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.liked',
          aggregateId: plantId
        })
      );
    });

    it('skips increment and acknowledges when plant.liked event was already processed', async () => {
      const envelope = buildEnvelope('plant.liked');
      has.mockResolvedValue(true);

      await consumer.handle(envelope);

      expect(run).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
      expect(increment).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith(
        'Duplicate domain event skipped',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.liked',
          aggregateId: envelope.aggregateId
        })
      );
    });

    it('applies decrement and claims event id for a new plant.unliked event', async () => {
      const plantId = uuidv4();
      const envelope = buildEnvelope('plant.unliked', plantId);

      await consumer.handle(envelope);

      expect(run).toHaveBeenCalledTimes(1);
      expect(claim).toHaveBeenCalledWith(
        'plant-likes-counter',
        envelope.eventId,
        expect.any(Date)
      );
      expect(decrement).toHaveBeenCalledWith(plantId);
      expect(info).toHaveBeenCalledWith(
        'Domain event applied',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.unliked',
          aggregateId: plantId
        })
      );
    });

    it('skips decrement and acknowledges when plant.unliked event was already processed', async () => {
      const envelope = buildEnvelope('plant.unliked');
      has.mockResolvedValue(true);

      await consumer.handle(envelope);

      expect(run).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
      expect(decrement).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith(
        'Duplicate domain event skipped',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.unliked',
          aggregateId: envelope.aggregateId
        })
      );
    });
  });

  describe('DomainEventConsumer declaration', () => {
    it('exposes a stable name and the declared event names it handles', () => {
      expect(consumer.name).toBe('plant-likes-counter');
      expect(
        [...consumer.eventNames].sort((a, b) => a.localeCompare(b))
      ).toEqual(['plant.liked', 'plant.unliked']);
    });

    it('ignores unrelated domain events without modifying storage or claiming events', async () => {
      const envelope = buildEnvelope('bed.deleted');

      await consumer.handle(envelope);

      expect(has).not.toHaveBeenCalled();
      expect(run).not.toHaveBeenCalled();
      expect(claim).not.toHaveBeenCalled();
      expect(increment).not.toHaveBeenCalled();
      expect(decrement).not.toHaveBeenCalled();
      expect(debug).toHaveBeenCalledWith(
        'Domain event ignored by consumer',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'bed.deleted'
        })
      );
    });
  });

  describe('User Story 2: Transactional atomicity and edge cases', () => {
    it('defers claim and counter side-effect until the unit of work executes', async () => {
      const envelope = buildEnvelope('plant.liked');
      let capturedOperation: (() => Promise<unknown>) | undefined;
      run.mockImplementation((operation: () => Promise<unknown>) => {
        capturedOperation = operation;
        return Promise.resolve();
      });

      await consumer.handle(envelope);

      expect(run).toHaveBeenCalledTimes(1);
      expect(claim).not.toHaveBeenCalled();
      expect(increment).not.toHaveBeenCalled();

      await capturedOperation?.();

      expect(claim).toHaveBeenCalledTimes(1);
      expect(increment).toHaveBeenCalledTimes(1);
    });

    it('rethrows when unit of work throws an unexpected database error', async () => {
      const envelope = buildEnvelope('plant.liked');
      const dbError = new Error('database connection lost');
      run.mockRejectedValue(dbError);

      await expect(consumer.handle(envelope)).rejects.toThrow(
        'database connection lost'
      );

      expect(error).toHaveBeenCalledWith(
        'Domain event processing failed',
        dbError,
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.liked',
          aggregateId: envelope.aggregateId
        })
      );
    });

    it('handles duplicate key conflict during concurrent claim race as already processed', async () => {
      const envelope = buildEnvelope('plant.liked');
      has.mockResolvedValue(false);
      run.mockRejectedValue(
        new DomainConflictException('Duplicate document with {"_id":"..."}')
      );

      await expect(consumer.handle(envelope)).resolves.not.toThrow();

      expect(info).toHaveBeenCalledWith(
        'Duplicate domain event skipped',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.liked',
          aggregateId: envelope.aggregateId
        })
      );
    });

    it('handles raw MongoDB code 11000 duplicate key error as already processed', async () => {
      const envelope = buildEnvelope('plant.liked');
      has.mockResolvedValue(false);
      run.mockRejectedValue({
        code: 11000,
        message: 'E11000 duplicate key error collection'
      });

      await expect(consumer.handle(envelope)).resolves.not.toThrow();

      expect(info).toHaveBeenCalledWith(
        'Duplicate domain event skipped',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.liked',
          aggregateId: envelope.aggregateId
        })
      );
    });

    it('claims event without modifying counter when target plant does not exist', async () => {
      const plantId = uuidv4();
      const envelope = buildEnvelope('plant.liked', plantId);
      exists.mockResolvedValue(false);

      await consumer.handle(envelope);

      expect(claim).toHaveBeenCalledWith(
        'plant-likes-counter',
        envelope.eventId,
        expect.any(Date)
      );
      expect(increment).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith(
        'Domain event target plant not found; acknowledged without counter update',
        expect.objectContaining({
          eventId: envelope.eventId,
          eventName: 'plant.liked',
          plantId
        })
      );
    });
  });
});
