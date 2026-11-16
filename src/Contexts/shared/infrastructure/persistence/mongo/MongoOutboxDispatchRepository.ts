import type { Db } from 'mongodb';

import type { OutboxDispatchRepository } from '../../../application/outbox/index.js';
import { MongoRepository } from './MongoRepository.js';

export type MongoOutboxDispatchRepositoryDependencies = {
  db: Db;
};

export class MongoOutboxDispatchRepository
  extends MongoRepository
  implements OutboxDispatchRepository
{
  constructor({ db }: MongoOutboxDispatchRepositoryDependencies) {
    super(db);
  }

  protected entityName(): string {
    return 'OutboxRecord';
  }

  protected collectionName(): string {
    return 'outbox';
  }

  public async markDispatched(
    eventId: string,
    dispatchedAt: Date
  ): Promise<void> {
    await this.handleMongoError(() =>
      this.collection().updateOne(
        { _id: eventId },
        { $set: { processedAt: dispatchedAt } }
      )
    );
  }
}
