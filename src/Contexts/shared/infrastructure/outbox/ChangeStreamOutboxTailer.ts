import type {
  ChangeStream,
  ChangeStreamInsertDocument,
  Collection,
  Document,
  ResumeToken
} from 'mongodb';

import type {
  EventForwarder,
  OutboxProgressRepository,
  OutboxRecord,
  OutboxTailer
} from '../../application/outbox/index.js';
import type { AppLogger } from '../../plugins/logger.plugin.js';
import { isUnresumableChangeStreamError } from '../persistence/mongo/mongoErrorCodes.js';

const FALLBACK_INDEX_HINT = 'outbox_processedAt_id';

export type OutboxTailerConfig = {
  OUTBOX_WORKER_FALLBACK_BATCH_SIZE: number;
  OUTBOX_WORKER_RECONNECT_INITIAL_MS: number;
  OUTBOX_WORKER_RECONNECT_MAX_MS: number;
};

export type ChangeStreamOutboxTailerDependencies = {
  outboxCollection: Collection<Document>;
  eventForwarder: EventForwarder;
  outboxProgressRepository: OutboxProgressRepository;
  logger: AppLogger;
  workerConfig: OutboxTailerConfig;
};

export class ChangeStreamOutboxTailer implements OutboxTailer {
  private readonly outboxCollection: Collection<Document>;
  private readonly eventForwarder: EventForwarder;
  private readonly outboxProgressRepository: OutboxProgressRepository;
  private readonly logger: AppLogger;
  private readonly config: OutboxTailerConfig;

  private running = false;
  private currentStream: ChangeStream<Document> | undefined;
  private lastForwardedId: string | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private resolveReconnect: (() => void) | undefined;

  constructor({
    outboxCollection,
    eventForwarder,
    outboxProgressRepository,
    logger,
    workerConfig
  }: ChangeStreamOutboxTailerDependencies) {
    this.outboxCollection = outboxCollection;
    this.eventForwarder = eventForwarder;
    this.outboxProgressRepository = outboxProgressRepository;
    this.logger = logger;
    this.config = workerConfig;
  }

  public async start(): Promise<void> {
    this.running = true;
    const progress = await this.outboxProgressRepository.load();
    this.lastForwardedId = progress.lastForwardedId;
    await this.runUntilStopped(progress.resumeToken);
  }

  public async stop(): Promise<void> {
    this.running = false;
    const resolve = this.resolveReconnect;
    this.clearDelay();
    resolve?.();

    const stream = this.currentStream;
    this.currentStream = undefined;
    if (stream !== undefined) {
      await this.closeStream(stream);
    }
  }

  private async runUntilStopped(initialToken?: ResumeToken): Promise<void> {
    let resumeToken = initialToken;
    let backoff = this.config.OUTBOX_WORKER_RECONNECT_INITIAL_MS;

    while (this.running) {
      try {
        await this.watchLive(resumeToken);
        return;
      } catch (error) {
        if (!this.running) {
          return;
        }
        if (isUnresumableChangeStreamError(error)) {
          await this.drainFallback();
          resumeToken = undefined;
          backoff = this.config.OUTBOX_WORKER_RECONNECT_INITIAL_MS;
          continue;
        }

        this.logger.warn(
          'Outbox tailer live watch interrupted; reconnecting',
          error
        );
        await this.delay(backoff);
        backoff = Math.min(
          backoff * 2,
          this.config.OUTBOX_WORKER_RECONNECT_MAX_MS
        );
        resumeToken = await this.reloadResumeToken();
      }
    }
  }

  private async watchLive(resumeToken?: ResumeToken): Promise<void> {
    const options: Document = {};
    if (resumeToken !== undefined) {
      options.resumeAfter = resumeToken;
    }

    const stream = this.outboxCollection.watch<Document>(
      [{ $match: { operationType: 'insert' } }],
      options
    );
    this.currentStream = stream;

    try {
      for await (const change of stream) {
        if (!this.running) {
          break;
        }
        await this.forwardLiveInsert(
          change as ChangeStreamInsertDocument<Document>
        );
      }
    } finally {
      this.currentStream = undefined;
      await this.closeStream(stream);
    }
  }

  private async forwardLiveInsert(
    change: ChangeStreamInsertDocument<Document>
  ): Promise<void> {
    const record = this.toRecord(change.fullDocument);
    await this.eventForwarder.forward(record);
    this.lastForwardedId = record.eventId;
    await this.outboxProgressRepository.save({
      resumeToken: change._id,
      lastForwardedId: record.eventId
    });
  }

  private async drainFallback(): Promise<void> {
    this.logger.warn(
      'Outbox tailer entering fallback catch-up (unresumable change stream)'
    );

    const cursor = this.outboxCollection
      .find(this.fallbackFilter())
      .sort({ _id: 1 })
      .hint(FALLBACK_INDEX_HINT)
      .batchSize(this.config.OUTBOX_WORKER_FALLBACK_BATCH_SIZE);

    try {
      for await (const document of cursor) {
        if (!this.running) {
          break;
        }
        await this.forwardFallbackDocument(document);
      }
    } finally {
      await cursor.close();
    }
  }

  private fallbackFilter(): Document {
    // Equality on `processedAt` (never stored, so `null` matches the absent
    // field) lets the composite `{ processedAt: 1, _id: 1 }` index serve the
    // `_id` range and the `_id` sort together, avoiding an in-memory SORT.
    const filter: Document = { processedAt: null };
    if (this.lastForwardedId !== undefined) {
      filter._id = { $gt: this.lastForwardedId };
    }
    return filter;
  }

  private async forwardFallbackDocument(document: Document): Promise<void> {
    const id = document._id as string;
    if (this.lastForwardedId !== undefined && id <= this.lastForwardedId) {
      return;
    }

    const record = this.toRecord(document);
    await this.eventForwarder.forward(record);
    this.lastForwardedId = record.eventId;
    await this.outboxProgressRepository.save({
      lastForwardedId: record.eventId
    });
  }

  private toRecord(document: Document): OutboxRecord {
    return {
      eventId: document._id as string,
      eventName: document.eventName as string,
      aggregateId: document.aggregateId as string,
      occurredAt: document.occurredAt as Date,
      payload: document.payload as object,
      createdAt: document.createdAt as Date
    };
  }

  private async reloadResumeToken(): Promise<ResumeToken> {
    const progress = await this.outboxProgressRepository.load();
    this.lastForwardedId = progress.lastForwardedId;
    return progress.resumeToken;
  }

  private async closeStream(stream: ChangeStream<Document>): Promise<void> {
    try {
      await stream.close();
    } catch (error) {
      this.logger.warn('Outbox tailer failed to close change stream', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.resolveReconnect = resolve;
      this.reconnectTimer = setTimeout(() => {
        this.clearDelay();
        resolve();
      }, ms);
      this.reconnectTimer.unref?.();
    });
  }

  private clearDelay(): void {
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.resolveReconnect = undefined;
  }
}
