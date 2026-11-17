import type { Db, Document } from 'mongodb';

import type { ProcessedEventsRepository } from '../../../domain/events/ProcessedEventsRepository.js';
import { MongoRepository } from './MongoRepository.js';

export type MongoProcessedEventsRepositoryDependencies = {
  db: Db;
};

type ProcessedEventDocument = Document & {
  _id: string;
  consumer: string;
  eventId: string;
  processedAt: Date;
};

const buildKey = (consumer: string, eventId: string): string =>
  `${consumer}#${eventId}`;

export class MongoProcessedEventsRepository
  extends MongoRepository
  implements ProcessedEventsRepository
{
  constructor({ db }: MongoProcessedEventsRepositoryDependencies) {
    super(db);
  }

  protected entityName(): string {
    return 'ProcessedEvent';
  }

  protected collectionName(): string {
    return 'processed_events';
  }

  public async claim(
    consumer: string,
    eventId: string,
    processedAt: Date = new Date()
  ): Promise<void> {
    const document: ProcessedEventDocument = {
      _id: buildKey(consumer, eventId),
      consumer,
      eventId,
      processedAt
    };

    await this.handleMongoError(() =>
      this.collection().insertOne(document, this.sessionOptions())
    );
  }

  public async has(consumer: string, eventId: string): Promise<boolean> {
    const count = await this.handleMongoError(() =>
      this.collection().countDocuments(
        { _id: buildKey(consumer, eventId) },
        { limit: 1, ...this.sessionOptions() }
      )
    );

    return count > 0;
  }

  public async count(): Promise<number> {
    return this.handleMongoError(() =>
      this.collection().countDocuments({}, this.sessionOptions())
    );
  }
}
