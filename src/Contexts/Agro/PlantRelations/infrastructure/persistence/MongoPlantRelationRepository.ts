import type { Collection, Db } from 'mongodb';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoRepository.js';
import type { PlantRelation } from '../../domain/entities/PlantRelation.js';
import type { PlantRelationRepository } from '../../domain/repositories/interfaces/PlantRelationRepository.js';
import type { PlantRelationPersistenceMapper } from '../../mappers/interfaces/PlantRelationPersistenceMapper.js';
import type { MongoPlantRelationDocument } from './types/MongoPlantRelationDocument.js';

export type MongoPlantRelationRepositoryDependencies = {
  db: Db;
  plantRelationPersistenceMapper: PlantRelationPersistenceMapper;
};

export class MongoPlantRelationRepository
  extends MongoRepository
  implements PlantRelationRepository
{
  private readonly persistenceMapper: PlantRelationPersistenceMapper;

  constructor({
    db,
    plantRelationPersistenceMapper
  }: MongoPlantRelationRepositoryDependencies) {
    super(db);
    this.persistenceMapper = plantRelationPersistenceMapper;
  }

  protected entityName(): string {
    return 'PlantRelation';
  }

  protected collectionName(): string {
    return 'plant_relations';
  }

  private relationCollection(): Collection<MongoPlantRelationDocument> {
    return this.db.collection<MongoPlantRelationDocument>(
      this.collectionName()
    );
  }

  async save(relation: PlantRelation): Promise<void> {
    const doc = this.persistenceMapper.toMongoDocument(relation);
    await this.persist(doc);
  }

  async findById(id: string): Promise<Nullable<PlantRelation>> {
    const doc = await this.handleMongoError(() =>
      this.relationCollection().findOne(
        { _id: toMongoId(id) },
        this.sessionOptions()
      )
    );

    return doc ? this.persistenceMapper.fromMongoDocument(doc) : null;
  }

  async findBySourcePlant(sourcePlantId: string): Promise<PlantRelation[]> {
    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          { sourcePlantId: toMongoId(sourcePlantId) },
          this.sessionOptions()
        )
        .toArray()
    );

    return docs.map((doc) => this.persistenceMapper.fromMongoDocument(doc));
  }

  async findByTargetPlant(targetPlantId: string): Promise<PlantRelation[]> {
    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          { targetPlantId: toMongoId(targetPlantId) },
          this.sessionOptions()
        )
        .toArray()
    );

    return docs.map((doc) => this.persistenceMapper.fromMongoDocument(doc));
  }

  async findBetweenPlants(
    sourcePlantId: string,
    targetPlantId: string
  ): Promise<PlantRelation[]> {
    if (sourcePlantId === targetPlantId) {
      return [];
    }

    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          {
            sourcePlantId: toMongoId(sourcePlantId),
            targetPlantId: toMongoId(targetPlantId)
          },
          this.sessionOptions()
        )
        .toArray()
    );

    return docs.map((doc) => this.persistenceMapper.fromMongoDocument(doc));
  }

  async findForPlantPair(
    plantAId: string,
    plantBId: string
  ): Promise<PlantRelation[]> {
    if (plantAId === plantBId) {
      return [];
    }

    const a = toMongoId(plantAId);
    const b = toMongoId(plantBId);

    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          {
            $or: [
              { sourcePlantId: a, targetPlantId: b },
              { sourcePlantId: b, targetPlantId: a }
            ]
          },
          this.sessionOptions()
        )
        .toArray()
    );

    return docs.map((doc) => this.persistenceMapper.fromMongoDocument(doc));
  }

  async findForPlantBatch(plantIds: string[]): Promise<PlantRelation[]> {
    const uniqueIds = [...new Set(plantIds)];
    if (uniqueIds.length < 2) {
      return [];
    }

    const binaryIds = uniqueIds.map(toMongoId);

    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          {
            sourcePlantId: { $in: binaryIds },
            targetPlantId: { $in: binaryIds }
          },
          this.sessionOptions()
        )
        .toArray()
    );

    return docs.map((doc) => this.persistenceMapper.fromMongoDocument(doc));
  }

  public override async delete(
    id: string,
    expectedVersion?: number
  ): Promise<boolean> {
    return super.delete(id, expectedVersion);
  }
}
