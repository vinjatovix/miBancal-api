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
    // `processedAt` is left absent (not null), so the `{ processedAt: 1, _id: 1 }`
    // index treats the record as pending.
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
