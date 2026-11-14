import { type Collection, type Db } from 'mongodb';
import { v7 as uuidv7 } from 'uuid';

import {
  down as dropOutboxCollection,
  up as createOutboxCollection
} from '../../../../../../migrations/scripts/20261114120000-create-outbox-collection.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

const COLLECTION_NAME = 'outbox';
const INDEX_NAME = 'outbox_processedAt_id';

type OutboxDocument = {
  _id: string;
  eventName: string;
  occurredAt: Date;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt?: Date | null;
};

type PlanNode = { stage?: unknown; indexName?: unknown };

/** Every `{ stage, indexName }` of a query plan, depth first. */
const planStages = (node: unknown): PlanNode[] => {
  if (!node || typeof node !== 'object') return [];
  const plan = node as Record<string, unknown>;
  const children = [
    plan.inputStage,
    ...(Array.isArray(plan.inputStages) ? (plan.inputStages as unknown[]) : [])
  ];

  return [
    { stage: plan.stage, indexName: plan.indexName },
    ...children.flatMap(planStages)
  ];
};

const pendingRecord = (id: string, createdAt: Date): OutboxDocument => ({
  _id: id,
  eventName: 'bed.deleted',
  occurredAt: createdAt,
  aggregateId: 'bed-1',
  payload: { bedId: 'bed-1', reason: 'cleared' },
  createdAt
});

let context: DbTestContext;
let db: Db;

const outbox = (): Collection<OutboxDocument> =>
  db.collection<OutboxDocument>(COLLECTION_NAME);

describe('outbox collection migration', () => {
  beforeAll(async () => {
    context = await createDbTestContext();
    db = context.db;
    await createOutboxCollection(db);
  });

  beforeEach(async () => {
    await context.reset();
    await createOutboxCollection(db);
  });

  afterAll(async () => {
    await context.close();
  });

  describe('record round-trip', () => {
    it('stores a well-formed pending record and reads every field back unchanged, with processedAt absent', async () => {
      const record = pendingRecord(uuidv7(), new Date('2026-11-14T10:00:00Z'));

      await outbox().insertOne(record);
      const read = await outbox().findOne({ _id: record._id });

      expect(read).toEqual(record);
      expect(Object.prototype.hasOwnProperty.call(read, 'processedAt')).toBe(
        false
      );
    });
  });

  describe('chronological ordering by _id', () => {
    it('returns records in occurrence order, with same-millisecond inserts deterministically ordered by the UUIDv7 tail', async () => {
      const ids = Array.from({ length: 6 }, () => uuidv7());
      const createdAt = new Date('2026-11-14T10:00:00Z');
      await outbox().insertMany(
        [...ids].reverse().map((id) => pendingRecord(id, createdAt))
      );

      const stored = await outbox()
        .find()
        .sort({ _id: 1 })
        .map((doc) => doc._id)
        .toArray();

      expect(stored).toEqual(ids);
    });
  });

  describe('pending lookup', () => {
    it('returns only pending records in chronological order', async () => {
      const first = uuidv7();
      const forwarded = uuidv7();
      const second = uuidv7();
      await outbox().insertMany([
        pendingRecord(second, new Date('2026-11-14T10:00:02Z')),
        {
          ...pendingRecord(forwarded, new Date('2026-11-14T10:00:01Z')),
          processedAt: new Date('2026-11-14T10:05:00Z')
        },
        pendingRecord(first, new Date('2026-11-14T10:00:00Z'))
      ]);

      const pending = await outbox()
        .find({ processedAt: null })
        .sort({ _id: 1 })
        .map((doc) => doc._id)
        .toArray();

      expect(pending).toEqual([first, second]);
    });

    it('serves pending records query using an index scan without collection scan or in-memory sort', async () => {
      const pending = pendingRecord(uuidv7(), new Date('2026-11-14T10:00:00Z'));
      const forwarded = {
        ...pendingRecord(uuidv7(), new Date('2026-11-14T09:00:00Z')),
        processedAt: new Date('2026-11-14T09:05:00Z')
      };
      await outbox().insertMany([pending, forwarded]);

      const explain = await outbox()
        .find({ processedAt: null })
        .sort({ _id: 1 })
        .explain('executionStats');
      const executionStats = explain.executionStats as {
        executionStages: unknown;
        totalDocsExamined: number;
        nReturned: number;
      };
      const stages = planStages(executionStats.executionStages);
      const stageNames = stages.map(({ stage }) => stage);

      expect(stageNames).not.toContain('COLLSCAN');
      expect(stageNames).not.toContain('SORT');
      expect(stages).toContainEqual({
        stage: 'IXSCAN',
        indexName: INDEX_NAME
      });
      expect(executionStats.totalDocsExamined).toBe(1);
      expect(executionStats.nReturned).toBe(1);
    });

    it('declares exactly the default _id index and the pending-lookup composite index', async () => {
      const indexes = await outbox().indexes();

      expect(indexes.map((index) => index.name).sort()).toEqual([
        '_id_',
        INDEX_NAME
      ]);
    });

    it('does not declare age-based TTL expiry on any index', async () => {
      const indexes = await outbox().indexes();

      expect(indexes.some((index) => 'expireAfterSeconds' in index)).toBe(
        false
      );
    });
  });

  describe('idempotent apply and clean reverse', () => {
    it('keeps an identical index set across repeated applies', async () => {
      const initialIndexes = (await outbox().indexes())
        .map((index) => index.name)
        .sort();

      await createOutboxCollection(db);
      const indexesAfterReapply = (await outbox().indexes())
        .map((index) => index.name)
        .sort();

      expect(indexesAfterReapply).toEqual(initialIndexes);
    });

    it('removes the collection and its index with no residue on down', async () => {
      await dropOutboxCollection(db);

      const remaining = await db
        .listCollections({ name: COLLECTION_NAME })
        .toArray();
      expect(remaining).toEqual([]);
    });
  });
});
