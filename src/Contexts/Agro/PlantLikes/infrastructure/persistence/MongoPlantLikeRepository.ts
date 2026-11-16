import type { Db } from 'mongodb';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import type { PlantLike } from '../../domain/entities/PlantLike.js';
import type { PlantLikeRepository } from '../../domain/repositories/interfaces/PlantLikeRepository.js';
import type { PlantLikePersistenceMapper } from '../../mappers/interfaces/PlantLikePersistenceMapper.js';
import type { MongoPlantLikeDocument } from './types/MongoPlantLikeDocument.js';

export type MongoPlantLikeRepositoryDependencies = {
  db: Db;
  plantLikePersistenceMapper: PlantLikePersistenceMapper;
};

/**
 * Writes only the `plant_likes` collection. The matching `likesCount` `$inc`
 * on `plants` is owned by `MongoPlantLikesCounterRepository` and orchestrated
 * by the use cases inside the same `MongoUnitOfWork` transaction, which this
 * repository joins through the ambient session (`sessionOptions()`).
 */
export class MongoPlantLikeRepository
  extends MongoRepository
  implements PlantLikeRepository
{
  private readonly persistenceMapper: PlantLikePersistenceMapper;

  constructor({
    db,
    plantLikePersistenceMapper
  }: MongoPlantLikeRepositoryDependencies) {
    super(db);
    this.persistenceMapper = plantLikePersistenceMapper;
  }

  protected entityName(): string {
    return 'PlantLike';
  }

  protected collectionName(): string {
    return 'plant_likes';
  }

  async add(like: PlantLike): Promise<boolean> {
    const document = this.persistenceMapper.toMongoDocument(like);

    // An upsert, not an insert: inside the unit-of-work transaction a
    // duplicate-key error would abort the whole transaction (so the commit
    // then fails). A repeat like must instead match the existing document and
    // write nothing. The unique `(userId, plantId)` index still guards storage.
    const result = await this.handleMongoError(() =>
      this.collection().updateOne(
        { userId: document.userId, plantId: document.plantId },
        { $setOnInsert: { _id: document._id, likedAt: document.likedAt } },
        { upsert: true, ...this.sessionOptions() }
      )
    );

    // A new like was created only when the upsert inserted; a match means the
    // like already existed, so the caller skips the counter increment.
    return result.upsertedCount === 1;
  }

  async remove(userId: string, plantId: string): Promise<boolean> {
    const result = await this.handleMongoError(() =>
      this.collection().deleteOne(
        { userId: toMongoId(userId), plantId: toMongoId(plantId) },
        this.sessionOptions()
      )
    );

    return result.deletedCount === 1;
  }

  async find(userId: string, plantId: string): Promise<Nullable<PlantLike>> {
    const document = await this.collection().findOne<MongoPlantLikeDocument>(
      { userId: toMongoId(userId), plantId: toMongoId(plantId) },
      this.sessionOptions()
    );

    return document === null
      ? null
      : this.persistenceMapper.fromMongoDocument(document);
  }
}
