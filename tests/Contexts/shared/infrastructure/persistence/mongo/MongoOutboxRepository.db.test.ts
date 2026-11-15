import { Collection, type Db } from 'mongodb';

import { up as createOutboxCollection } from '../../../../../../migrations/scripts/20261114120000-create-outbox-collection.js';
import { BedDeleted } from '../../../../../../src/Contexts/Agro/Beds/domain/events/index.js';
import {
  PlantLiked,
  PlantUnliked
} from '../../../../../../src/Contexts/Agro/PlantLikes/domain/events/index.js';
import type { UnitOfWork } from '../../../../../../src/Contexts/shared/application/interfaces/index.js';
import type { OutboxRepository } from '../../../../../../src/Contexts/shared/application/outbox/index.js';
import type { DomainEvent } from '../../../../../../src/Contexts/shared/domain/events/index.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { random } from '../../../../shared/fixtures/random.js';

const COLLECTION_NAME = 'outbox';

type StoredOutbox = {
  _id: string;
  eventName: string;
  aggregateId: string;
  occurredAt: Date;
  payload: {
    eventId: string;
    eventName: string;
    aggregateId: string;
    occurredAt: string;
    payload: Record<string, unknown>;
  };
  createdAt: Date;
  processedAt?: Date;
};

class ForcedFailure extends Error {}

const bedDeleted = (): BedDeleted => {
  const bedId = random.uuid();

  return new BedDeleted({
    bedId,
    ownerId: random.uuid(),
    deletedBy: 'gardener',
    occurredAt: new Date().toISOString()
  });
};

const plantLiked = (): PlantLiked => {
  const plantId = random.uuid();

  return new PlantLiked(plantId, {
    plantId,
    userId: random.uuid(),
    likedAt: new Date().toISOString()
  });
};

const plantUnliked = (): PlantUnliked => {
  const plantId = random.uuid();

  return new PlantUnliked(plantId, { plantId, userId: random.uuid() });
};

let context: DbTestContext;
let db: Db;
let outboxRepository: OutboxRepository;
let unitOfWork: UnitOfWork;

const outbox = (): Collection<StoredOutbox> =>
  db.collection<StoredOutbox>(COLLECTION_NAME);

const stored = (): Promise<StoredOutbox[]> =>
  outbox().find().sort({ _id: 1 }).toArray();

const firstStored = async (): Promise<StoredOutbox> => {
  const [doc] = await stored();
  if (!doc) {
    throw new Error('expected at least one staged outbox document');
  }

  return doc;
};

describe('MongoOutboxRepository (integration)', () => {
  beforeAll(async () => {
    context = await createDbTestContext();
    db = context.db;
    outboxRepository =
      context.container.resolve<OutboxRepository>('outboxRepository');
    unitOfWork = context.container.resolve<UnitOfWork>('unitOfWork');
    await createOutboxCollection(db);
  });

  beforeEach(async () => {
    await context.reset();
    await createOutboxCollection(db);
  });

  afterAll(async () => {
    await context.close();
  });

  describe('staging within the unit of work', () => {
    it('writes one well-formed document per event with processedAt absent', async () => {
      const event: DomainEvent = bedDeleted();

      await unitOfWork.run(() => outboxRepository.stage([event]));

      const doc = await firstStored();
      expect(Object.keys(doc).sort((a, b) => a.localeCompare(b))).toEqual([
        '_id',
        'aggregateId',
        'createdAt',
        'eventName',
        'occurredAt',
        'payload'
      ]);
      expect(Object.prototype.hasOwnProperty.call(doc, 'processedAt')).toBe(
        false
      );
      expect(doc.occurredAt).toBeInstanceOf(Date);
      expect(doc.createdAt).toBeInstanceOf(Date);
    });

    it('keeps the record consistent with its self-contained payload', async () => {
      const event = bedDeleted();

      await unitOfWork.run(() => outboxRepository.stage([event]));

      const doc = await firstStored();
      expect(doc._id).toBe(event.eventId);
      expect(doc._id).toBe(doc.payload.eventId);
      expect(doc.eventName).toBe(doc.payload.eventName);
      expect(doc.aggregateId).toBe(doc.payload.aggregateId);
      expect(doc.occurredAt.toISOString()).toBe(doc.payload.occurredAt);
      expect(doc.payload.payload).toEqual(event.payload);
    });

    it('preserves exact occurrence order under an ascending _id sort', async () => {
      const events = [bedDeleted(), plantLiked(), plantUnliked(), bedDeleted()];
      const expectedOrder = events.map((event) => event.eventId);

      await unitOfWork.run(() => outboxRepository.stage(events));

      const ids = (await stored()).map((doc) => doc._id);
      expect(ids).toEqual(expectedOrder);
    });
  });

  describe('transaction atomicity', () => {
    it('persists zero records when the transaction aborts after staging', async () => {
      const event = bedDeleted();

      await expect(
        unitOfWork.run(async () => {
          await outboxRepository.stage([event]);
          throw new ForcedFailure();
        })
      ).rejects.toBeInstanceOf(ForcedFailure);

      expect(await stored()).toHaveLength(0);
    });
  });

  describe('empty batch', () => {
    it('issues no insert to the driver, inside or outside a transaction', async () => {
      const insertMany = jest.spyOn(Collection.prototype, 'insertMany');

      try {
        await unitOfWork.run(() => outboxRepository.stage([]));
        await expect(outboxRepository.stage([])).resolves.toBeUndefined();

        expect(insertMany).not.toHaveBeenCalled();
        expect(await stored()).toHaveLength(0);
      } finally {
        insertMany.mockRestore();
      }
    });
  });
});
