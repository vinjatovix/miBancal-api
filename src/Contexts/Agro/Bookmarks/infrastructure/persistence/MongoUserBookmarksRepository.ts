import type { Db } from 'mongodb';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UserId } from '../../../../Auth/domain/UserId.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import type { UserBookmarksPrimitives } from '../../domain/entities/types/UserBookmarksPrimitives.js';
import type { UserBookmarks } from '../../domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../domain/repositories/interfaces/UserBookmarksRepository.js';
import type { UserBookmarksId } from '../../domain/UserBookmarksId.js';
import type { UserBookmarksPersistenceMapper } from '../../mappers/interfaces/UserBookmarksPersistenceMapper.js';
import type { MongoUserBookmarksDocument } from './types/MongoUserBookmarksDocument.js';

export type MongoUserBookmarksRepositoryDependencies = {
  db: Db;
  userBookmarksPersistenceMapper: UserBookmarksPersistenceMapper;
};

export class MongoUserBookmarksRepository
  extends MongoCrudRepository<
    UserBookmarks,
    UserBookmarksPrimitives,
    MongoUserBookmarksDocument,
    unknown
  >
  implements UserBookmarksRepository
{
  private readonly persistenceMapper: UserBookmarksPersistenceMapper;

  constructor({
    db,
    userBookmarksPersistenceMapper
  }: MongoUserBookmarksRepositoryDependencies) {
    super(db);
    this.persistenceMapper = userBookmarksPersistenceMapper;
  }

  protected entityName(): string {
    return 'UserBookmarks';
  }

  protected collectionName(): string {
    return 'user_bookmarks';
  }

  protected toDomain(document: MongoUserBookmarksDocument): UserBookmarks {
    return this.persistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(entity: UserBookmarks): MongoUserBookmarksDocument {
    return this.persistenceMapper.toMongoDocument(entity);
  }

  override async findById(
    id: UserBookmarksId
  ): Promise<Nullable<UserBookmarks>> {
    return this.findOneDomain({ _id: toMongoId(id) });
  }

  async findByUserId(userId: UserId): Promise<Nullable<UserBookmarks>> {
    return this.findOneDomain({ userId: toMongoId(userId) });
  }

  override async save(aggregate: UserBookmarks): Promise<void> {
    const mongoDocument = this.toMongoDocument(aggregate);
    await this.handleMongoError(() =>
      this.collection().insertOne(mongoDocument, this.sessionOptions())
    );
  }
}
