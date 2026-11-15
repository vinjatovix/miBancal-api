import type { Collection, Document } from 'mongodb';

import type {
  EventForwarder,
  OutboxProgress,
  OutboxRecord
} from '../../../../../src/Contexts/shared/application/outbox/index.js';
import {
  ChangeStreamOutboxTailer,
  type OutboxTailerConfig
} from '../../../../../src/Contexts/shared/infrastructure/outbox/index.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';

type InsertChange = { _id: Document; fullDocument: Document };

type StreamScript = {
  inserts?: InsertChange[];
  throwError?: Error;
  block?: boolean;
};

const tick = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const mongoError = (code: number, codeName?: string): Error =>
  Object.assign(
    new Error(`mongo error ${code}`),
    codeName === undefined ? { code } : { code, codeName }
  );

class FakeChangeStream {
  public closed = false;
  private resolveBlock?: () => void;

  constructor(private readonly script: StreamScript) {}

  tryNext(): Promise<Document | null> {
    if (this.script.throwError !== undefined) {
      return Promise.reject(this.script.throwError);
    }
    return Promise.resolve(null);
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<Document> {
    await Promise.resolve();
    for (const change of this.script.inserts ?? []) {
      yield change;
    }
    if (this.script.throwError !== undefined) {
      throw this.script.throwError;
    }
    if (this.script.block) {
      await new Promise<void>((resolve) => {
        this.resolveBlock = resolve;
      });
    }
  }

  close(): Promise<void> {
    this.closed = true;
    this.resolveBlock?.();
    return Promise.resolve();
  }
}

class FakeCursor {
  constructor(private readonly docs: Document[]) {}

  sort(): this {
    return this;
  }

  hint(): this {
    return this;
  }

  batchSize(): this {
    return this;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<Document> {
    await Promise.resolve();
    for (const doc of this.docs) {
      yield doc;
    }
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

type WatchCall = { options: { resumeAfter?: Document } };
type FindCall = { filter: Document };

class FakeOutboxCollection {
  public readonly watchCalls: WatchCall[] = [];
  public readonly findCalls: FindCall[] = [];
  public readonly callLog: ('watch' | 'find')[] = [];
  private readonly streams: FakeChangeStream[];
  private readonly findResults: Document[][];

  constructor(streamScripts: StreamScript[], findResults: Document[][] = []) {
    this.streams = streamScripts.map((script) => new FakeChangeStream(script));
    this.findResults = findResults;
  }

  watch(_pipeline: unknown, options: { resumeAfter?: Document }): unknown {
    this.watchCalls.push({ options });
    this.callLog.push('watch');
    return this.streams.shift() ?? new FakeChangeStream({ block: true });
  }

  find(filter: Document): unknown {
    this.findCalls.push({ filter });
    this.callLog.push('find');
    return new FakeCursor(this.findResults.shift() ?? []);
  }
}

const buildLogger = (): AppLogger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const buildProgressRepository = (progress: OutboxProgress) => ({
  load: jest.fn<Promise<OutboxProgress>, []>().mockResolvedValue(progress),
  save: jest.fn<Promise<void>, [OutboxProgress]>().mockResolvedValue(undefined)
});

const buildStatefulProgressRepository = (initial: OutboxProgress = {}) => {
  let state: OutboxProgress = { ...initial };
  return {
    load: jest
      .fn<Promise<OutboxProgress>, []>()
      .mockImplementation(() => Promise.resolve({ ...state })),
    save: jest
      .fn<Promise<void>, [OutboxProgress]>()
      .mockImplementation((progress: OutboxProgress) => {
        state = { ...progress };
        return Promise.resolve();
      })
  };
};

const buildDispatchRepository = () => ({
  markDispatched: jest
    .fn<Promise<void>, [string, Date]>()
    .mockResolvedValue(undefined)
});

const resolvingForwarder = () => ({
  forward: jest.fn<Promise<void>, [OutboxRecord]>().mockResolvedValue(undefined)
});

const CONFIG: OutboxTailerConfig = {
  OUTBOX_WORKER_FALLBACK_BATCH_SIZE: 100,
  OUTBOX_WORKER_RECONNECT_INITIAL_MS: 1,
  OUTBOX_WORKER_RECONNECT_MAX_MS: 2
};

const outboxDocument = (id: string): Document => ({
  _id: id,
  eventName: 'bed.deleted',
  aggregateId: `agg-${id}`,
  occurredAt: new Date('2026-11-14T10:00:00.000Z'),
  payload: { id },
  createdAt: new Date('2026-11-14T10:00:01.000Z')
});

const insert = (id: string, token: Document): InsertChange => ({
  _id: token,
  fullDocument: outboxDocument(id)
});

const buildTailer = (
  collection: FakeOutboxCollection,
  progress: OutboxProgress = {},
  forwarder: EventForwarder = resolvingForwarder(),
  dispatchRepository = buildDispatchRepository()
) => {
  const progressRepository = buildProgressRepository(progress);
  const tailer = new ChangeStreamOutboxTailer({
    outboxCollection: collection as unknown as Collection<Document>,
    eventForwarder: forwarder,
    outboxProgressRepository: progressRepository,
    outboxDispatchRepository: dispatchRepository,
    logger: buildLogger(),
    workerConfig: CONFIG
  });
  return { tailer, progressRepository, dispatchRepository };
};

const forwardedIds = (forward: {
  mock: { calls: [OutboxRecord][] };
}): string[] => forward.mock.calls.map((call) => call[0].eventId);

describe('ChangeStreamOutboxTailer', () => {
  describe('live forwarding (US1)', () => {
    it('forwards an observed insert carrying the full outbox record', async () => {
      const collection = new FakeOutboxCollection([
        { inserts: [insert('id-1', { _data: 't1' })] }
      ]);
      const forwarder = resolvingForwarder();
      const { tailer } = buildTailer(collection, {}, forwarder);

      await tailer.start();

      expect(forwarder.forward).toHaveBeenCalledTimes(1);
      expect(forwarder.forward).toHaveBeenCalledWith({
        eventId: 'id-1',
        eventName: 'bed.deleted',
        aggregateId: 'agg-id-1',
        occurredAt: new Date('2026-11-14T10:00:00.000Z'),
        payload: { id: 'id-1' },
        createdAt: new Date('2026-11-14T10:00:01.000Z')
      });
    });

    it('forwards multiple inserts in ascending _id order and saves progress after each', async () => {
      const collection = new FakeOutboxCollection([
        {
          inserts: [
            insert('id-1', { _data: 't1' }),
            insert('id-2', { _data: 't2' }),
            insert('id-3', { _data: 't3' })
          ]
        }
      ]);
      const forwarder = resolvingForwarder();
      const { tailer, progressRepository } = buildTailer(
        collection,
        {},
        forwarder
      );

      await tailer.start();

      expect(forwardedIds(forwarder.forward)).toEqual(['id-1', 'id-2', 'id-3']);
      expect(progressRepository.save).toHaveBeenNthCalledWith(1, {
        resumeToken: { _data: 't1' },
        lastForwardedId: 'id-1'
      });
      expect(progressRepository.save).toHaveBeenNthCalledWith(3, {
        resumeToken: { _data: 't3' },
        lastForwardedId: 'id-3'
      });
    });

    it('performs no forwards and no busy-wait while the stream is idle', async () => {
      const collection = new FakeOutboxCollection([{ block: true }]);
      const forwarder = resolvingForwarder();
      const { tailer, progressRepository } = buildTailer(
        collection,
        {},
        forwarder
      );

      const started = tailer.start();
      await tick();
      await tailer.stop();
      await started;

      expect(forwarder.forward).not.toHaveBeenCalled();
      expect(progressRepository.save).not.toHaveBeenCalled();
      expect(collection.watchCalls).toHaveLength(1);
      expect(collection.findCalls).toHaveLength(0);
    });
  });

  describe('dispatch marking (US3)', () => {
    it('marks the record dispatched after a successful forward', async () => {
      const collection = new FakeOutboxCollection([
        { inserts: [insert('id-1', { _data: 't1' })] }
      ]);
      const forwarder = resolvingForwarder();
      const { tailer, dispatchRepository } = buildTailer(
        collection,
        {},
        forwarder
      );

      await tailer.start();

      expect(dispatchRepository.markDispatched).toHaveBeenCalledTimes(1);
      const [eventId, dispatchedAt] =
        dispatchRepository.markDispatched.mock.calls[0] ?? [];
      expect(eventId).toBe('id-1');
      expect(dispatchedAt).toBeInstanceOf(Date);
      const forwardOrder = forwarder.forward.mock.invocationCallOrder[0] ?? 0;
      const markOrder =
        dispatchRepository.markDispatched.mock.invocationCallOrder[0] ??
        Infinity;
      expect(forwardOrder).toBeLessThan(markOrder);
    });

    it('does not mark dispatched when the forward fails', async () => {
      const collection = new FakeOutboxCollection([
        { inserts: [insert('id-1', { _data: 't1' })] },
        { inserts: [] }
      ]);
      const forwarder = {
        forward: jest
          .fn<Promise<void>, [OutboxRecord]>()
          .mockRejectedValueOnce(new Error('downstream unavailable'))
          .mockResolvedValue(undefined)
      };
      const { tailer, dispatchRepository } = buildTailer(
        collection,
        {},
        forwarder
      );

      await tailer.start();

      expect(dispatchRepository.markDispatched).not.toHaveBeenCalledWith(
        'id-1',
        expect.anything()
      );
    });
  });

  describe('restart resume (US2)', () => {
    it('resumes the live watch from the stored resume token when present', async () => {
      const token = { _data: 'stored-token' };
      const collection = new FakeOutboxCollection([{ inserts: [] }]);
      const { tailer } = buildTailer(
        collection,
        { resumeToken: token, lastForwardedId: 'id-9' },
        resolvingForwarder()
      );

      await tailer.start();

      expect(collection.watchCalls[0]?.options.resumeAfter).toEqual(token);
    });

    it('starts a fresh live watch from now when no progress is stored', async () => {
      const collection = new FakeOutboxCollection([{ inserts: [] }]);
      const { tailer } = buildTailer(collection, {}, resolvingForwarder());

      await tailer.start();

      expect(collection.watchCalls[0]?.options.resumeAfter).toBeUndefined();
    });
  });

  describe('fallback catch-up (US2 recovery ordering)', () => {
    it('opens the fresh live watch before draining the backlog, then watches from now', async () => {
      const collection = new FakeOutboxCollection(
        [{ throwError: mongoError(286) }, { inserts: [] }],
        [[outboxDocument('id-2'), outboxDocument('id-3')]]
      );
      const forwarder = resolvingForwarder();
      const { tailer, progressRepository } = buildTailer(
        collection,
        { resumeToken: { _data: 'stale' }, lastForwardedId: 'id-1' },
        forwarder
      );

      await tailer.start();

      expect(collection.callLog).toEqual(['watch', 'watch', 'find']);
      expect(collection.findCalls[0]?.filter).toEqual({
        processedAt: null,
        _id: { $gt: 'id-1' }
      });
      expect(forwardedIds(forwarder.forward)).toEqual(['id-2', 'id-3']);
      expect(progressRepository.save).toHaveBeenLastCalledWith({
        lastForwardedId: 'id-3'
      });
      expect(collection.watchCalls).toHaveLength(2);
      expect(collection.watchCalls[1]?.options.resumeAfter).toBeUndefined();
    });

    it('skips boundary records already forwarded when draining the backlog', async () => {
      const collection = new FakeOutboxCollection(
        [{ throwError: mongoError(286) }, { inserts: [] }],
        [[outboxDocument('id-1'), outboxDocument('id-2')]]
      );
      const forwarder = resolvingForwarder();
      const { tailer } = buildTailer(
        collection,
        { lastForwardedId: 'id-1' },
        forwarder
      );

      await tailer.start();

      expect(forwardedIds(forwarder.forward)).toEqual(['id-2']);
    });

    it('reconnects and resumes live on a transient drop without entering fallback', async () => {
      const token = { _data: 'valid-token' };
      const collection = new FakeOutboxCollection([
        { throwError: mongoError(6, 'HostUnreachable') },
        { inserts: [] }
      ]);
      const { tailer } = buildTailer(
        collection,
        { resumeToken: token, lastForwardedId: 'id-1' },
        resolvingForwarder()
      );

      await tailer.start();

      expect(collection.findCalls).toHaveLength(0);
      expect(collection.watchCalls).toHaveLength(2);
      expect(collection.watchCalls[1]?.options.resumeAfter).toEqual(token);
    });

    it('stays in a safe recover-then-watch loop when rotation recurs mid-catch-up', async () => {
      const collection = new FakeOutboxCollection(
        [
          { throwError: mongoError(286) },
          { throwError: mongoError(286) },
          { inserts: [] }
        ],
        [
          [
            outboxDocument('id-2'),
            outboxDocument('id-3'),
            outboxDocument('id-4')
          ]
        ]
      );
      const forwarder = resolvingForwarder();
      const { tailer } = buildTailer(
        collection,
        { lastForwardedId: 'id-1' },
        forwarder
      );

      await expect(tailer.start()).resolves.toBeUndefined();

      expect(forwardedIds(forwarder.forward)).toEqual(['id-2', 'id-3', 'id-4']);
      expect(collection.watchCalls).toHaveLength(3);
    });
  });

  describe('at-least-once on forward failure (FR-010)', () => {
    it('does not advance progress past a record whose forward rejected', async () => {
      const collection = new FakeOutboxCollection([
        { inserts: [insert('id-1', { _data: 't1' })] },
        { inserts: [] }
      ]);
      const forwarder = {
        forward: jest
          .fn<Promise<void>, [OutboxRecord]>()
          .mockRejectedValueOnce(new Error('downstream unavailable'))
          .mockResolvedValue(undefined)
      };
      const { tailer, progressRepository } = buildTailer(
        collection,
        {},
        forwarder
      );

      await tailer.start();

      expect(progressRepository.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ lastForwardedId: 'id-1' })
      );
    });

    it('redelivers a live event whose forward failed by resuming from the last saved token', async () => {
      const tokenBefore = { _data: 't0' };
      const tokenFailed = { _data: 't1' };
      const collection = new FakeOutboxCollection([
        { inserts: [insert('id-0', tokenBefore), insert('id-1', tokenFailed)] },
        { inserts: [insert('id-1', tokenFailed)] }
      ]);
      const forwarder = {
        forward: jest
          .fn<Promise<void>, [OutboxRecord]>()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('downstream unavailable'))
          .mockResolvedValue(undefined)
      };
      const progressRepository = buildStatefulProgressRepository();
      const tailer = new ChangeStreamOutboxTailer({
        outboxCollection: collection as unknown as Collection<Document>,
        eventForwarder: forwarder,
        outboxProgressRepository: progressRepository,
        outboxDispatchRepository: buildDispatchRepository(),
        logger: buildLogger(),
        workerConfig: CONFIG
      });

      await tailer.start();

      expect(forwardedIds(forwarder.forward)).toEqual(['id-0', 'id-1', 'id-1']);
      expect(collection.watchCalls[1]?.options.resumeAfter).toEqual(
        tokenBefore
      );
      expect(progressRepository.save).toHaveBeenLastCalledWith({
        resumeToken: tokenFailed,
        lastForwardedId: 'id-1'
      });
    });
  });

  describe('status() seam', () => {
    it('reports running false and undefined timestamps before first start', () => {
      const collection = new FakeOutboxCollection([]);
      const { tailer } = buildTailer(collection);

      const status = tailer.status();

      expect(status.running).toBe(false);
      expect(status.startedAt).toBeUndefined();
      expect(status.lastForwardedAt).toBeUndefined();
      expect(status.lastForwardedId).toBeUndefined();
    });

    it('tracks running true and startedAt while active, and running false after stop', async () => {
      const collection = new FakeOutboxCollection([{ block: true }]);
      const { tailer } = buildTailer(collection);

      const startPromise = tailer.start();
      await tick();

      const activeStatus = tailer.status();
      expect(activeStatus.running).toBe(true);
      expect(activeStatus.startedAt).toBeInstanceOf(Date);

      await tailer.stop();
      await startPromise;

      const stoppedStatus = tailer.status();
      expect(stoppedStatus.running).toBe(false);
      expect(stoppedStatus.startedAt).toEqual(activeStatus.startedAt);
    });

    it('refreshes lastForwardedAt and lastForwardedId together on a successful forward', async () => {
      const collection = new FakeOutboxCollection([
        { inserts: [insert('id-1', { _data: 't1' })] }
      ]);
      const { tailer } = buildTailer(collection);

      await tailer.start();

      const status = tailer.status();
      expect(status.lastForwardedId).toBe('id-1');
      expect(status.lastForwardedAt).toBeInstanceOf(Date);
    });
  });
});
