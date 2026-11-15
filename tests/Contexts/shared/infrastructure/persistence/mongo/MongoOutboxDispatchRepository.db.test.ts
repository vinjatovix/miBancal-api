import type { Collection, Document } from 'mongodb';

import { up as createOutbox } from '../../../../../../migrations/scripts/20261114120000-create-outbox-collection.js';
import { MongoOutboxDispatchRepository } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoOutboxDispatchRepository.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

type OutboxDoc = Document & { _id: string; processedAt?: Date };

let context: DbTestContext;
let outbox: Collection<OutboxDoc>;
let repository: MongoOutboxDispatchRepository;

const insertPending = async (id: string): Promise<void> => {
  await outbox.insertOne({
    _id: id,
    eventName: 'bed.deleted',
    aggregateId: `agg-${id}`,
    occurredAt: new Date(),
    payload: { id },
    createdAt: new Date()
  });
};

beforeAll(async () => {
  context = await createDbTestContext();
  await createOutbox(context.db);
  outbox = context.db.collection<OutboxDoc>('outbox');
  repository = new MongoOutboxDispatchRepository({ db: context.db });
});

beforeEach(async () => {
  await context.reset();
});

afterAll(async () => {
  await context.close();
});

describe('MongoOutboxDispatchRepository (real mongo)', () => {
  it('sets processedAt to the dispatch timestamp on durable forward', async () => {
    await insertPending('event-1');
    const dispatchedAt = new Date('2026-11-15T12:00:00.000Z');

    await repository.markDispatched('event-1', dispatchedAt);

    const stored = await outbox.findOne({ _id: 'event-1' });
    expect(stored?.processedAt).toEqual(dispatchedAt);
  });

  it('leaves processedAt absent (never null) for a record that was never dispatched', async () => {
    await insertPending('event-2');

    const stored = await outbox.findOne({ _id: 'event-2' });

    expect(stored).not.toBeNull();
    expect('processedAt' in (stored ?? {})).toBe(false);
  });

  it('is idempotent: re-marking overwrites with the latest timestamp', async () => {
    await insertPending('event-3');

    await repository.markDispatched(
      'event-3',
      new Date('2026-11-15T12:00:00.000Z')
    );
    const later = new Date('2026-11-15T12:05:00.000Z');
    await repository.markDispatched('event-3', later);

    const stored = await outbox.findOne({ _id: 'event-3' });
    expect(stored?.processedAt).toEqual(later);
  });
});
