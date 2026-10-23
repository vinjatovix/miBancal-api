import type { Db } from 'mongodb';
import { toMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoRepository } from '../../../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import type { PlantLikesCounterRepository } from '../../../domain/repositories/interfaces/PlantLikesCounterRepository.js';

export type MongoPlantLikesCounterRepositoryDependencies = {
  db: Db;
};

/**
 * Maintains the denormalized `plants.likesCount` projection. It only ever
 * `$inc`s the counter; it never authors any other plant field, so the write
 * path for the Plant aggregate stays untouched (FR-008). Runs inside the
 * active `MongoUnitOfWork` transaction via the ambient session.
 */
export class MongoPlantLikesCounterRepository
  extends MongoRepository
  implements PlantLikesCounterRepository
{
  constructor({ db }: MongoPlantLikesCounterRepositoryDependencies) {
    super(db);
  }

  protected entityName(): string {
    return 'Plant';
  }

  protected collectionName(): string {
    return 'plants';
  }

  async increment(plantId: string): Promise<void> {
    await this.handleMongoError(() =>
      this.collection().updateOne(
        { _id: toMongoId(plantId) },
        { $inc: { likesCount: 1 } },
        this.sessionOptions()
      )
    );
  }

  async decrement(plantId: string): Promise<void> {
    // The `{ likesCount: { $gt: 0 } }` guard is defense-in-depth: the use case
    // only decrements on a confirmed removal, but the filter guarantees the
    // counter can never drift below zero (FR-007).
    await this.handleMongoError(() =>
      this.collection().updateOne(
        { _id: toMongoId(plantId), likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } },
        this.sessionOptions()
      )
    );
  }
}
