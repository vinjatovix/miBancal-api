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
    const binarySource = toMongoId(sourcePlantId);
    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          {
            $or: [
              { sourcePlantId: binarySource },
              {
                'source.scope': 'plant',
                'source.value': binarySource
              }
            ]
          },
          this.sessionOptions()
        )
        .toArray()
    );

    return docs.map((doc) => this.persistenceMapper.fromMongoDocument(doc));
  }

  async findByTargetPlant(targetPlantId: string): Promise<PlantRelation[]> {
    const binaryTarget = toMongoId(targetPlantId);
    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          {
            $or: [
              { targetPlantId: binaryTarget },
              {
                'target.scope': 'plant',
                'target.value': binaryTarget
              }
            ]
          },
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

    const s = toMongoId(sourcePlantId);
    const t = toMongoId(targetPlantId);

    const docs = await this.handleMongoError(() =>
      this.relationCollection()
        .find(
          {
            $and: [
              {
                $or: [
                  { sourcePlantId: s },
                  { 'source.scope': 'plant', 'source.value': s }
                ]
              },
              {
                $or: [
                  { targetPlantId: t },
                  { 'target.scope': 'plant', 'target.value': t }
                ]
              }
            ]
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
              {
                $and: [
                  {
                    $or: [
                      { sourcePlantId: a },
                      { 'source.scope': 'plant', 'source.value': a }
                    ]
                  },
                  {
                    $or: [
                      { targetPlantId: b },
                      { 'target.scope': 'plant', 'target.value': b }
                    ]
                  }
                ]
              },
              {
                $and: [
                  {
                    $or: [
                      { sourcePlantId: b },
                      { 'source.scope': 'plant', 'source.value': b }
                    ]
                  },
                  {
                    $or: [
                      { targetPlantId: a },
                      { 'target.scope': 'plant', 'target.value': a }
                    ]
                  }
                ]
              }
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
            $and: [
              {
                $or: [
                  { sourcePlantId: { $in: binaryIds } },
                  {
                    'source.scope': 'plant',
                    'source.value': { $in: binaryIds }
                  }
                ]
              },
              {
                $or: [
                  { targetPlantId: { $in: binaryIds } },
                  {
                    'target.scope': 'plant',
                    'target.value': { $in: binaryIds }
                  }
                ]
              }
            ]
          },
          this.sessionOptions()
        )
        .toArray()
    );

    return docs.map((doc) => this.persistenceMapper.fromMongoDocument(doc));
  }

  async findApplicableForTaxa(criteria: {
    readonly plantIds: readonly string[];
    readonly genera: readonly string[];
    readonly familyIds: readonly string[];
  }): Promise<PlantRelation[]> {
    const binaryPlantIds = [...new Set(criteria.plantIds)].map(toMongoId);
    const uniqueGenera = [...new Set(criteria.genera)];
    const binaryFamilyIds = [...new Set(criteria.familyIds)].map(toMongoId);

    const sourceClauses: Record<string, unknown>[] = [];
    if (binaryPlantIds.length > 0) {
      sourceClauses.push(
        { 'source.scope': 'plant', 'source.value': { $in: binaryPlantIds } },
        { sourcePlantId: { $in: binaryPlantIds } }
      );
    }
    if (uniqueGenera.length > 0) {
      sourceClauses.push({
        'source.scope': 'genus',
        'source.value': { $in: uniqueGenera }
      });
    }
    if (binaryFamilyIds.length > 0) {
      sourceClauses.push({
        'source.scope': 'family',
        'source.value': { $in: binaryFamilyIds }
      });
    }

    if (sourceClauses.length === 0) {
      return [];
    }

    const targetClauses: Record<string, unknown>[] = [
      { 'target.scope': 'all' }
    ];
    if (binaryPlantIds.length > 0) {
      targetClauses.push(
        { 'target.scope': 'plant', 'target.value': { $in: binaryPlantIds } },
        { targetPlantId: { $in: binaryPlantIds } }
      );
    }
    if (uniqueGenera.length > 0) {
      targetClauses.push({
        'target.scope': 'genus',
        'target.value': { $in: uniqueGenera }
      });
    }
    if (binaryFamilyIds.length > 0) {
      targetClauses.push({
        'target.scope': 'family',
        'target.value': { $in: binaryFamilyIds }
      });
    }

    const filter = {
      $and: [{ $or: sourceClauses }, { $or: targetClauses }]
    };

    const docs = await this.handleMongoError(() =>
      this.relationCollection().find(filter, this.sessionOptions()).toArray()
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
