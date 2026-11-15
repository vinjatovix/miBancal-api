import type { ChangeStream, Collection, Document } from 'mongodb';

import { up as createOutbox } from '../../../../../migrations/scripts/20261114120000-create-outbox-collection.js';
import { up as createOutboxProgress } from '../../../../../migrations/scripts/20261114130000-create-outbox-progress-collection.js';
import type {
  EventForwarder,
  OutboxRecord
} from '../../../../../src/Contexts/shared/application/outbox/index.js';
import {
  ChangeStreamOutboxTailer,
  type OutboxTailerConfig
} from '../../../../../src/Contexts/shared/infrastructure/outbox/index.js';
import { MongoOutboxDispatchRepository } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoOutboxDispatchRepository.js';
import { MongoOutboxProgressRepository } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoOutboxProgressRepository.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

type OutboxDoc = Document & { _id: string };

const CONFIG: OutboxTailerConfig = {
  OUTBOX_WORKER_FALLBACK_BATCH_SIZE: 100,
  OUTBOX_WORKER_RECONNECT_INITIAL_MS: 10,
  OUTBOX_WORKER_RECONNECT_MAX_MS: 20
};

const noopLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

class RecordingForwarder implements EventForwarder {
  public readonly forwarded: OutboxRecord[] = [];

  forward(record: OutboxRecord): Promise<void> {
    this.forwarded.push(record);
    return Promise.resolve();
  }

  ids(): string[] {
    return this.forwarded.map((record) => record.eventId);
  }
}

const failingStream = (error: Error): ChangeStream<Document> => {
  const stream = {
    [Symbol.asyncIterator](): AsyncIterator<Document> {
      return {
        next: (): Promise<IteratorResult<Document>> => Promise.reject(error)
      };
    },
    close(): Promise<void> {
      return Promise.resolve();
    }
  };
  return stream as unknown as ChangeStream<Document>;
};

class ScriptedOutboxCollection {
  public readonly watchErrors: Error[] = [];

  constructor(private readonly real: Collection<Document>) {}

  watch(pipeline: Document[], options: Document): ChangeStream<Document> {
    const error = this.watchErrors.shift();
    if (error !== undefined) {
      return failingStream(error);
    }
    return this.real.watch<Document>(pipeline, options);
  }

  find(filter: Document): unknown {
    return this.real.find(filter);
  }
}

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 8000
): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await sleep(25);
  }
};

let context: DbTestContext;
let outbox: Collection<OutboxDoc>;
let seq = 0;

const makeId = (): string =>
  `01931000-0000-7000-8000-${String(++seq).padStart(12, '0')}`;

const insertOutbox = async (
  overrides: Partial<OutboxDoc> = {}
): Promise<string> => {
  const id = overrides._id ?? makeId();
  const document: OutboxDoc = {
    _id: id,
    eventName: 'bed.deleted',
    aggregateId: `agg-${id}`,
    occurredAt: new Date(),
    payload: { id },
    createdAt: new Date(),
    ...overrides
  };
  await outbox.insertOne(document);
  return id;
};

const buildTailer = (
  forwarder: EventForwarder,
  collection: Collection<Document> = outbox as unknown as Collection<Document>
): ChangeStreamOutboxTailer =>
  new ChangeStreamOutboxTailer({
    outboxCollection: collection,
    eventForwarder: forwarder,
    outboxProgressRepository: new MongoOutboxProgressRepository({
      db: context.db
    }),
    outboxDispatchRepository: new MongoOutboxDispatchRepository({
      db: context.db
    }),
    logger: noopLogger(),
    workerConfig: CONFIG
  });

beforeAll(async () => {
  context = await createDbTestContext();
  await createOutbox(context.db);
  await createOutboxProgress(context.db);
  outbox = context.db.collection<OutboxDoc>('outbox');
});

beforeEach(async () => {
  await context.reset();
  seq = 0;
});

afterAll(async () => {
  await context.close();
});

describe('ChangeStreamOutboxTailer (real change stream)', () => {
  describe('live forwarding (US1)', () => {
    it('forwards live inserts exactly once, in ascending _id order, with full payload', async () => {
      const forwarder = new RecordingForwarder();
      const tailer = buildTailer(forwarder);
      const started = tailer.start();

      await sleep(200);
      const id1 = await insertOutbox();
      const id2 = await insertOutbox();

      await waitFor(() => forwarder.forwarded.length === 2);
      await tailer.stop();
      await started;

      expect(forwarder.ids()).toEqual([id1, id2]);
      expect(forwarder.forwarded[0]).toMatchObject({
        eventId: id1,
        eventName: 'bed.deleted',
        aggregateId: `agg-${id1}`,
        payload: { id: id1 }
      });
    });

    it('never forwards inserts from a rolled-back transaction (US1.3)', async () => {
      const forwarder = new RecordingForwarder();
      const tailer = buildTailer(forwarder);
      const started = tailer.start();
      await sleep(200);

      const session = context.client.startSession();
      const rolledBackId = makeId();
      try {
        await session
          .withTransaction(async () => {
            await outbox.insertOne(
              {
                _id: rolledBackId,
                eventName: 'x',
                aggregateId: 'x',
                occurredAt: new Date(),
                payload: {},
                createdAt: new Date()
              },
              { session }
            );
            throw new Error('force rollback');
          })
          .catch(() => undefined);
      } finally {
        await session.endSession();
      }

      const committedId = await insertOutbox();
      await waitFor(() => forwarder.ids().includes(committedId));
      await tailer.stop();
      await started;

      expect(forwarder.ids()).not.toContain(rolledBackId);
    });

    it('stays idle with no spurious forwards when the outbox receives nothing', async () => {
      const forwarder = new RecordingForwarder();
      const tailer = buildTailer(forwarder);
      const started = tailer.start();

      await sleep(400);
      await tailer.stop();
      await started;

      expect(forwarder.forwarded).toHaveLength(0);
    });
  });

  describe('restart resume (US2)', () => {
    it('resumes from the stored token without replaying already-forwarded events', async () => {
      const forwarderA = new RecordingForwarder();
      const tailerA = buildTailer(forwarderA);
      const startedA = tailerA.start();
      await sleep(200);

      const id1 = await insertOutbox();
      await waitFor(() => forwarderA.ids().includes(id1));
      await tailerA.stop();
      await startedA;

      const id2 = await insertOutbox();

      const forwarderB = new RecordingForwarder();
      const tailerB = buildTailer(forwarderB);
      const startedB = tailerB.start();

      await waitFor(() => forwarderB.ids().includes(id2));
      await tailerB.stop();
      await startedB;

      expect(forwarderB.ids()).toEqual([id2]);
      expect(forwarderB.ids()).not.toContain(id1);
    });
  });

  describe('rotated-oplog fallback and resilience (US3)', () => {
    it('serves the fallback catch-up query with an index scan and no in-memory sort (SC-006)', async () => {
      await insertOutbox();
      await insertOutbox();

      const plan = await outbox
        .find({ processedAt: null, _id: { $gt: '0' } })
        .sort({ _id: 1 })
        .hint('outbox_processedAt_id')
        .explain('executionStats');

      const serialized = JSON.stringify(plan);
      expect(serialized).toContain('"indexName":"outbox_processedAt_id"');
      expect(serialized).toContain('IXSCAN');
      expect(serialized).not.toContain('"stage":"SORT"');
    });

    it('recovers from a connection drop and an oplog rotation in one run without losing events (SC-008)', async () => {
      const backlog1 = await insertOutbox();
      const backlog2 = await insertOutbox();

      const scripted = new ScriptedOutboxCollection(
        outbox as unknown as Collection<Document>
      );
      scripted.watchErrors.push(mongoError(6), mongoError(286));

      const forwarder = new RecordingForwarder();
      const tailer = buildTailer(
        forwarder,
        scripted as unknown as Collection<Document>
      );
      const started = tailer.start();

      await waitFor(
        () =>
          forwarder.ids().includes(backlog1) &&
          forwarder.ids().includes(backlog2)
      );

      await sleep(200);
      const liveId = await insertOutbox();
      await waitFor(() => forwarder.ids().includes(liveId));

      await tailer.stop();
      await started;

      const ids = forwarder.ids();
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain(backlog1);
      expect(ids).toContain(backlog2);
      expect(ids).toContain(liveId);
      expect(ids.indexOf(backlog1)).toBeLessThan(ids.indexOf(backlog2));
    });

    it('loses no event and marks each dispatched across an oplog rotation, tolerating duplicates (SC-001/SC-006)', async () => {
      const backlog = await insertOutbox();

      const scripted = new ScriptedOutboxCollection(
        outbox as unknown as Collection<Document>
      );
      scripted.watchErrors.push(mongoError(286));

      const forwarder = new RecordingForwarder();
      const tailer = buildTailer(
        forwarder,
        scripted as unknown as Collection<Document>
      );
      const started = tailer.start();

      await waitFor(() => forwarder.ids().includes(backlog));

      await sleep(200);
      const live = await insertOutbox();
      await waitFor(() => forwarder.ids().includes(live));

      await tailer.stop();
      await started;

      const ids = forwarder.ids();
      expect(ids).toContain(backlog);
      expect(ids).toContain(live);

      const backlogDoc = await outbox.findOne({ _id: backlog });
      const liveDoc = await outbox.findOne({ _id: live });
      expect(backlogDoc?.processedAt).toBeInstanceOf(Date);
      expect(liveDoc?.processedAt).toBeInstanceOf(Date);
      expect(backlogDoc?.processedAt).not.toBeNull();
    });
  });
});
