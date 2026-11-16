import type { Db, Document } from 'mongodb';

import type { ProcessedEventsRepository } from '../../../domain/events/ProcessedEventsRepository.js';
import { MongoRepository } from './MongoRepository.js';

export type MongoProcessedEventsRepositoryDependencies = {
  db: Db;
};

type ProcessedEventDocument = Document & {
  _id: string;
  processedAt: Date;
};

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
    eventId: string,
    processedAt: Date = new Date()
  ): Promise<void> {
    const document: ProcessedEventDocument = {
      _id: eventId,
      processedAt
    };

    await this.handleMongoError(() =>
      this.collection().insertOne(document, this.sessionOptions())
    );
  }

  public async has(eventId: string): Promise<boolean> {
    const count = await this.handleMongoError(() =>
      this.collection().countDocuments(
        { _id: eventId },
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
