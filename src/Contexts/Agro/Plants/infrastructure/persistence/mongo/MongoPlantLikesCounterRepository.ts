import type { Db } from 'mongodb';
import { UuidValidator } from '../../../../../shared/domain/valueObject/index.js';
import {
  fromMongoId,
  toMongoId
} from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoRepository } from '../../../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import type { PlantLikesCounterRepository } from '../../../domain/repositories/interfaces/PlantLikesCounterRepository.js';

interface LikesCountDocument {
  _id: unknown;
  likesCount?: number;
}

export type MongoPlantLikesCounterRepositoryDependencies = {
  db: Db;
};

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
    await this.handleMongoError(() =>
      this.collection().updateOne(
        { _id: toMongoId(plantId), likesCount: { $gt: 0 } },
        { $inc: { likesCount: -1 } },
        this.sessionOptions()
      )
    );
  }

  getLikesCount(plantId: string): Promise<number> {
    return this.handleMongoError(async () => {
      const document = await this.collection().findOne<LikesCountDocument>(
        { _id: toMongoId(plantId) },
        { projection: { _id: 0, likesCount: 1 }, ...this.sessionOptions() }
      );

      return document?.likesCount ?? 0;
    });
  }

  getLikesCounts(plantIds: readonly string[]): Promise<Map<string, number>> {
    const mongoIds = [...new Set(plantIds)]
      .filter((id) => UuidValidator.isValid(id))
      .map(toMongoId);
    if (mongoIds.length === 0) {
      return Promise.resolve(new Map<string, number>());
    }

    return this.handleMongoError(async () => {
      const documents = await this.collection()
        .find<LikesCountDocument>(
          { _id: { $in: mongoIds } },
          { projection: { _id: 1, likesCount: 1 }, ...this.sessionOptions() }
        )
        .toArray();

      return new Map(
        documents.map((doc) => [fromMongoId(doc._id), doc.likesCount ?? 0])
      );
    });
  }
}
