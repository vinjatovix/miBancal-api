import type { Collection, Db, Document } from 'mongodb';
import { v7 as uuidv7 } from 'uuid';

import { up as createOutbox } from '../../../../../migrations/scripts/20261114120000-create-outbox-collection.js';
import { MongoOutboxPendingWorkChecker } from '../../../../../src/Contexts/shared/infrastructure/outbox/MongoOutboxPendingWorkChecker.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

const COLLECTION_NAME = 'outbox';
const INDEX_NAME = 'outbox_processedAt_id';

type OutboxDocument = {
  _id: string;
  eventName: string;
  occurredAt: Date;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  processedAt?: Date;
};

type PlanNode = { stage?: unknown; indexName?: unknown };

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

const createOutboxDocument = (
  id: string,
  processedAt?: Date
): OutboxDocument => ({
  _id: id,
  eventName: 'bed.deleted',
  occurredAt: new Date('2026-11-15T10:00:00.000Z'),
  aggregateId: 'bed-123',
  payload: { bedId: 'bed-123' },
  createdAt: new Date('2026-11-15T10:00:00.000Z'),
  ...(processedAt ? { processedAt } : {})
});

describe('MongoOutboxPendingWorkChecker (db)', () => {
  let context: DbTestContext;
  let db: Db;
  let outboxCollection: Collection<OutboxDocument>;
  let checker: MongoOutboxPendingWorkChecker;

  beforeAll(async () => {
    context = await createDbTestContext();
    db = context.db;
    await createOutbox(db);
    outboxCollection = db.collection<OutboxDocument>(COLLECTION_NAME);
    checker = new MongoOutboxPendingWorkChecker({
      outboxCollection: outboxCollection as unknown as Collection<Document>
    });
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await outboxCollection.deleteMany({});
  });

  it('returns false when the outbox collection is empty', async () => {
    const hasPending = await checker.hasPendingWork();

    expect(hasPending).toBe(false);
  });

  it('returns false when all records are processed or before lastForwardedId', async () => {
    const id1 = uuidv7();
    const id2 = uuidv7();
    await outboxCollection.insertMany([
      createOutboxDocument(id1, new Date('2026-11-15T10:05:00.000Z')),
      createOutboxDocument(id2, new Date('2026-11-15T10:06:00.000Z'))
    ]);

    const hasPending = await checker.hasPendingWork(id2);

    expect(hasPending).toBe(false);
  });

  it('returns true when an unforwarded record exists with no lastForwardedId given', async () => {
    const id = uuidv7();
    await outboxCollection.insertOne(createOutboxDocument(id));

    const hasPending = await checker.hasPendingWork();

    expect(hasPending).toBe(true);
  });

  it('returns true when an unforwarded record exists past lastForwardedId', async () => {
    const id1 = uuidv7();
    const id2 = uuidv7();
    await outboxCollection.insertMany([
      createOutboxDocument(id1),
      createOutboxDocument(id2)
    ]);

    const hasPending = await checker.hasPendingWork(id1);

    expect(hasPending).toBe(true);
  });

  it('executes via an IXSCAN on outbox_processedAt_id and examines at most one document', async () => {
    const id1 = uuidv7();
    const id2 = uuidv7();
    const id3 = uuidv7();
    await outboxCollection.insertMany([
      createOutboxDocument(id1),
      createOutboxDocument(id2),
      createOutboxDocument(id3)
    ]);

    const filter: Document = {
      processedAt: null,
      _id: { $gt: id1 }
    };
    const explain = await outboxCollection
      .find(filter, { projection: { _id: 1 } })
      .hint(INDEX_NAME)
      .limit(1)
      .explain('executionStats');

    const executionStats = explain.executionStats as {
      executionStages: unknown;
      totalDocsExamined: number;
      nReturned: number;
    };
    const stages = planStages(executionStats.executionStages);
    const stageNames = stages.map(({ stage }) => stage);

    expect(stageNames).not.toContain('COLLSCAN');
    expect(stages).toContainEqual({
      stage: 'IXSCAN',
      indexName: INDEX_NAME
    });
    expect(executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
    expect(executionStats.nReturned).toBe(1);
  });
});
