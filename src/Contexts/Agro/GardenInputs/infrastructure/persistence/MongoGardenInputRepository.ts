import type { Db } from 'mongodb';

import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import type { GardenInput } from '../../domain/entities/GardenInput.js';
import type { GardenInputFilter } from '../../domain/entities/types/GardenInputFilter.js';
import type { GardenInputPrimitives } from '../../domain/entities/types/GardenInputPrimitives.js';
import type { GardenInputRepository } from '../../domain/repositories/interfaces/GardenInputRepository.js';
import type { GardenInputPersistenceMapper } from '../../mappers/interfaces/GardenInputPersistenceMapper.js';
import type { MongoGardenInputDocument } from './types/MongoGardenInputDocument.js';

export type MongoGardenInputRepositoryDependencies = {
  db: Db;
  gardenInputPersistenceMapper: GardenInputPersistenceMapper;
};

export class MongoGardenInputRepository
  extends MongoCrudRepository<
    GardenInput,
    GardenInputPrimitives,
    MongoGardenInputDocument,
    GardenInputFilter
  >
  implements GardenInputRepository
{
  private readonly gardenInputPersistenceMapper: GardenInputPersistenceMapper;

  constructor({
    db,
    gardenInputPersistenceMapper
  }: MongoGardenInputRepositoryDependencies) {
    super(db);
    this.gardenInputPersistenceMapper = gardenInputPersistenceMapper;
  }

  protected entityName(): string {
    return 'GardenInput';
  }

  protected collectionName(): string {
    return 'gardenInputs';
  }

  protected toDomain(document: MongoGardenInputDocument): GardenInput {
    return this.gardenInputPersistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(
    gardenInput: GardenInput
  ): MongoGardenInputDocument {
    return this.gardenInputPersistenceMapper.toMongoDocument(gardenInput);
  }

  protected activeFilter(): UnknownRecord {
    return { status: { $ne: 'deleted' } };
  }

  async findBySlug(slug: string): Promise<Nullable<GardenInput>> {
    const document = await this.collection().findOne<MongoGardenInputDocument>(
      { slug },
      this.sessionOptions()
    );

    return document === null ? null : this.toDomain(document);
  }

  async findActiveBySlug(slug: string): Promise<Nullable<GardenInput>> {
    return this.findOneDomain({ slug, ...this.activeFilter() });
  }
}
