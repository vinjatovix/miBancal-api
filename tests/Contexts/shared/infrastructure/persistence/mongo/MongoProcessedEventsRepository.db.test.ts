import type { Db } from 'mongodb';
import { v7 as uuidv7 } from 'uuid';

import { up as createProcessedEventsCollection } from '../../../../../../migrations/scripts/20261116120000-create-processed-events-collection.js';
import type { UnitOfWork } from '../../../../../../src/Contexts/shared/application/interfaces/index.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { MongoProcessedEventsRepository } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoProcessedEventsRepository.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

class RollbackError extends Error {}

const CONSUMER = 'test-consumer';

let context: DbTestContext;
let db: Db;
let repository: MongoProcessedEventsRepository;
let unitOfWork: UnitOfWork;

describe('MongoProcessedEventsRepository (integration)', () => {
  beforeAll(async () => {
    context = await createDbTestContext();
    db = context.db;
    repository = new MongoProcessedEventsRepository({ db });
    unitOfWork = context.container.resolve<UnitOfWork>('unitOfWork');
    await createProcessedEventsCollection(db);
  });

  beforeEach(async () => {
    await context.reset();
    await createProcessedEventsCollection(db);
  });

  afterAll(async () => {
    await context.close();
  });

  describe('claim', () => {
    it('records a new event id and makes it discoverable via has', async () => {
      const eventId = uuidv7();

      await repository.claim(CONSUMER, eventId);

      const exists = await repository.has(CONSUMER, eventId);
      expect(exists).toBe(true);

      const doc = await db
        .collection<{
          _id: string;
          consumer: string;
          eventId: string;
          processedAt: Date;
        }>('processed_events')
        .findOne({ _id: `${CONSUMER}#${eventId}` });
      expect(doc?.consumer).toBe(CONSUMER);
      expect(doc?.eventId).toBe(eventId);
      expect(doc?.processedAt).toBeInstanceOf(Date);
    });

    it('throws DomainConflictException on repeat claim by the same consumer', async () => {
      const eventId = uuidv7();
      await repository.claim(CONSUMER, eventId);

      await expect(repository.claim(CONSUMER, eventId)).rejects.toBeInstanceOf(
        DomainConflictException
      );
    });

    it('lets two consumers claim the same event id independently', async () => {
      const eventId = uuidv7();

      await repository.claim('consumer-a', eventId);
      await repository.claim('consumer-b', eventId);

      expect(await repository.has('consumer-a', eventId)).toBe(true);
      expect(await repository.has('consumer-b', eventId)).toBe(true);
    });

    it('records an explicit processedAt date', async () => {
      const eventId = uuidv7();
      const processedAt = new Date('2026-11-16T12:00:00.000Z');

      await repository.claim(CONSUMER, eventId, processedAt);

      const doc = await db
        .collection<{
          _id: string;
          consumer: string;
          eventId: string;
          processedAt: Date;
        }>('processed_events')
        .findOne({ _id: `${CONSUMER}#${eventId}` });
      expect(doc).toEqual({
        _id: `${CONSUMER}#${eventId}`,
        consumer: CONSUMER,
        eventId,
        processedAt
      });
    });
  });

  describe('has', () => {
    it('returns false when the event id was never claimed', async () => {
      const eventId = uuidv7();

      const exists = await repository.has(CONSUMER, eventId);

      expect(exists).toBe(false);
    });

    it('returns false for a different consumer than the one that claimed', async () => {
      const eventId = uuidv7();
      await repository.claim('consumer-a', eventId);

      const exists = await repository.has('consumer-b', eventId);

      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('returns zero on an empty collection', async () => {
      const total = await repository.count();

      expect(total).toBe(0);
    });

    it('accurately counts claimed events', async () => {
      await repository.claim(CONSUMER, uuidv7());
      await repository.claim(CONSUMER, uuidv7());

      const total = await repository.count();

      expect(total).toBe(2);
    });
  });

  describe('transactional participation', () => {
    it('rolls back event claim when unit of work throws an error', async () => {
      const eventId = uuidv7();

      await expect(
        unitOfWork.run(async () => {
          await repository.claim(CONSUMER, eventId);
          throw new RollbackError('aborted transaction');
        })
      ).rejects.toBeInstanceOf(RollbackError);

      const exists = await repository.has(CONSUMER, eventId);
      expect(exists).toBe(false);
    });

    it('commits event claim when unit of work succeeds', async () => {
      const eventId = uuidv7();

      await unitOfWork.run(async () => {
        await repository.claim(CONSUMER, eventId);
      });

      const exists = await repository.has(CONSUMER, eventId);
      expect(exists).toBe(true);
    });
  });

  describe('TTL index', () => {
    it('verifies that the TTL index exists with expireAfterSeconds 1209600', async () => {
      const indexes = await db.collection('processed_events').indexes();
      const ttlIndex = indexes.find(
        (idx) => idx.name === 'processed_events_processedAt_ttl'
      );

      expect(ttlIndex).toBeDefined();
      expect(ttlIndex?.key).toEqual({ processedAt: 1 });
      expect(ttlIndex?.expireAfterSeconds).toBe(1209600);
    });
  });
});
