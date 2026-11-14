import type { Db, Document } from 'mongodb';

import type { OutboxRepository } from '../../../application/outbox/index.js';
import type { DomainEvent } from '../../../domain/events/index.js';
import { MongoRepository } from './MongoRepository.js';

export type MongoOutboxRepositoryDependencies = {
  db: Db;
};

type OutboxDocument = Document & {
  _id: string;
  eventName: string;
  aggregateId: string;
  occurredAt: Date;
  payload: object;
  createdAt: Date;
};

/**
 * Stages domain events into the `outbox` collection within the active unit of
 * work. `processedAt` is intentionally omitted on insert (never persisted as
 * `null`): its absence marks the record pending for the
 * `{ processedAt: 1, _id: 1 }` index.
 */
export class MongoOutboxRepository
  extends MongoRepository
  implements OutboxRepository
{
  constructor({ db }: MongoOutboxRepositoryDependencies) {
    super(db);
  }

  protected entityName(): string {
    return 'OutboxRecord';
  }

  protected collectionName(): string {
    return 'outbox';
  }

  public async stage(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const now = new Date();
    const documents: OutboxDocument[] = events.map((event) => ({
      _id: event.eventId,
      eventName: event.eventName,
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      payload: event.toPrimitives(),
      createdAt: now
    }));

    await this.handleMongoError(() =>
      this.collection().insertMany(documents, {
        ordered: true,
        ...this.sessionOptions()
      })
    );
  }
}
