import type { CollationOptions, Db } from 'mongodb';

import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { Location } from '../../domain/entities/Location.js';
import type { LocationFilter } from '../../domain/entities/types/LocationFilter.js';
import type { LocationPrimitives } from '../../domain/entities/types/LocationPrimitives.js';
import type { LocationRepository } from '../../domain/repositories/interfaces/LocationRepository.js';
import type { LocationPersistenceMapper } from '../../mappers/interfaces/LocationPersistenceMapper.js';
import type { MongoLocationDocument } from './types/MongoLocationDocument.js';

export type MongoLocationRepositoryDependencies = {
  db: Db;
  locationPersistenceMapper: LocationPersistenceMapper;
};

const NAME_COLLATION: CollationOptions = { locale: 'es', strength: 1 };

export class MongoLocationRepository
  extends MongoCrudRepository<
    Location,
    LocationPrimitives,
    MongoLocationDocument,
    LocationFilter
  >
  implements LocationRepository
{
  private readonly locationPersistenceMapper: LocationPersistenceMapper;

  constructor({
    db,
    locationPersistenceMapper
  }: MongoLocationRepositoryDependencies) {
    super(db);
    this.locationPersistenceMapper = locationPersistenceMapper;
  }

  protected entityName(): string {
    return 'Location';
  }

  protected collectionName(): string {
    return 'locations';
  }

  protected toDomain(document: MongoLocationDocument): Location {
    return this.locationPersistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(entity: Location): MongoLocationDocument {
    return this.locationPersistenceMapper.toMongoDocument(entity);
  }

  protected activeFilter(): UnknownRecord {
    return { status: { $ne: 'deleted' } };
  }

  protected getCollation(): CollationOptions {
    return NAME_COLLATION;
  }

  protected toMongoSortField(key: string): string {
    return key === 'createdAt' ? 'metadata.createdAt' : key;
  }

  // Owner scoping and soft-delete are never client-settable: every listing
  // filter is merged with the active scope here.
  protected toMongoFilter(filter?: LocationFilter): Record<string, unknown> {
    const mongoFilter = super.toMongoFilter(filter);
    if (typeof mongoFilter.userId === 'string') {
      mongoFilter.userId = toMongoId(mongoFilter.userId);
    }
    return { ...mongoFilter, ...this.activeFilter() };
  }

  // Insert-only: the id comes from the client, like Bed/PlantInstance. A
  // duplicate id or a duplicate active name (partial unique index) is
  // translated to `DomainConflictException` by `handleMongoError`.
  async create(location: Location): Promise<void> {
    const document = this.toMongoDocument(location);
    await this.handleMongoError(() =>
      this.collection().insertOne(document, this.sessionOptions())
    );
  }

  async findOwnedActiveById(
    id: string,
    userId: string
  ): Promise<Nullable<Location>> {
    return this.findOneDomain({
      _id: toMongoId(id),
      userId: toMongoId(userId),
      ...this.activeFilter()
    });
  }

  // Equality under the `es`/strength-1 collation (case/accent-insensitive),
  // never a regex: served by the partial unique index on { userId, name }.
  async findActiveByNameForOwner(
    userId: string,
    name: string
  ): Promise<Nullable<Location>> {
    const document = await this.collection().findOne<MongoLocationDocument>(
      { userId: toMongoId(userId), name, ...this.activeFilter() },
      { collation: NAME_COLLATION, ...this.sessionOptions() }
    );

    return document === null ? null : this.toDomain(document);
  }

  async findByUserId(userId: string): Promise<Location[]> {
    const documents = await this.collection()
      .find<MongoLocationDocument>({
        userId: toMongoId(userId),
        ...this.activeFilter()
      })
      .collation(NAME_COLLATION)
      .toArray();

    return documents.map((document) => this.toDomain(document));
  }
}
