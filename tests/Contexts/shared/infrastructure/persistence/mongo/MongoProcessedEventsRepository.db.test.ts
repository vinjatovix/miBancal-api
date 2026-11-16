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

      await repository.claim(eventId);

      const exists = await repository.has(eventId);
      expect(exists).toBe(true);

      const doc = await db
        .collection<{ _id: string; processedAt: Date }>('processed_events')
        .findOne({ _id: eventId });
      expect(doc?._id).toBe(eventId);
      expect(doc?.processedAt).toBeInstanceOf(Date);
    });

    it('throws DomainConflictException on repeat claim with the same eventId', async () => {
      const eventId = uuidv7();
      await repository.claim(eventId);

      await expect(repository.claim(eventId)).rejects.toBeInstanceOf(
        DomainConflictException
      );
    });

    it('records an explicit processedAt date', async () => {
      const eventId = uuidv7();
      const processedAt = new Date('2026-11-16T12:00:00.000Z');

      await repository.claim(eventId, processedAt);

      const doc = await db
        .collection<{ _id: string; processedAt: Date }>('processed_events')
        .findOne({ _id: eventId });
      expect(doc).toEqual({
        _id: eventId,
        processedAt
      });
    });
  });

  describe('has', () => {
    it('returns false when the event id was never claimed', async () => {
      const eventId = uuidv7();

      const exists = await repository.has(eventId);

      expect(exists).toBe(false);
    });
  });

  describe('count', () => {
    it('returns zero on an empty collection', async () => {
      const total = await repository.count();

      expect(total).toBe(0);
    });

    it('accurately counts claimed events', async () => {
      await repository.claim(uuidv7());
      await repository.claim(uuidv7());

      const total = await repository.count();

      expect(total).toBe(2);
    });
  });

  describe('transactional participation', () => {
    it('rolls back event claim when unit of work throws an error', async () => {
      const eventId = uuidv7();

      await expect(
        unitOfWork.run(async () => {
          await repository.claim(eventId);
          throw new RollbackError('aborted transaction');
        })
      ).rejects.toBeInstanceOf(RollbackError);

      const exists = await repository.has(eventId);
      expect(exists).toBe(false);
    });

    it('commits event claim when unit of work succeeds', async () => {
      const eventId = uuidv7();

      await unitOfWork.run(async () => {
        await repository.claim(eventId);
      });

      const exists = await repository.has(eventId);
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
