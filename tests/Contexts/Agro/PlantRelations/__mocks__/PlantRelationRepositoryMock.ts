/* eslint-disable @typescript-eslint/require-await */
import type { PlantRelation } from '../../../../../src/Contexts/Agro/PlantRelations/domain/entities/PlantRelation.js';
import type { PlantRelationRepository } from '../../../../../src/Contexts/Agro/PlantRelations/domain/repositories/interfaces/PlantRelationRepository.js';
import { DomainConflictException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

export class PlantRelationRepositoryMock implements PlantRelationRepository {
  readonly saveMock = jest.fn();
  readonly findByIdMock = jest.fn();
  readonly findBySourcePlantMock = jest.fn();
  readonly findByTargetPlantMock = jest.fn();
  readonly findBetweenPlantsMock = jest.fn();
  readonly findForPlantPairMock = jest.fn();
  readonly findForPlantBatchMock = jest.fn();
  readonly deleteMock = jest.fn();

  private readonly storage = new Map<string, PlantRelation>();

  populate(relations: readonly PlantRelation[]): void {
    for (const rel of relations) {
      this.storage.set(rel.id, rel);
    }
  }

  async save(relation: PlantRelation): Promise<void> {
    this.saveMock(relation);
    for (const existing of this.storage.values()) {
      if (
        existing.id !== relation.id &&
        existing.sourcePlantId === relation.sourcePlantId &&
        existing.targetPlantId === relation.targetPlantId &&
        existing.mechanism === relation.mechanism
      ) {
        throw new DomainConflictException(
          `PlantRelation already exists between source '${relation.sourcePlantId}' and target '${relation.targetPlantId}' with mechanism '${relation.mechanism}'`
        );
      }
    }
    this.storage.set(relation.id, relation);
  }

  async findById(id: string): Promise<Nullable<PlantRelation>> {
    this.findByIdMock(id);
    return this.storage.get(id) ?? null;
  }

  async findBySourcePlant(sourcePlantId: string): Promise<PlantRelation[]> {
    this.findBySourcePlantMock(sourcePlantId);
    return [...this.storage.values()].filter(
      (r) => r.sourcePlantId === sourcePlantId
    );
  }

  async findByTargetPlant(targetPlantId: string): Promise<PlantRelation[]> {
    this.findByTargetPlantMock(targetPlantId);
    return [...this.storage.values()].filter(
      (r) => r.targetPlantId === targetPlantId
    );
  }

  async findBetweenPlants(
    sourcePlantId: string,
    targetPlantId: string
  ): Promise<PlantRelation[]> {
    this.findBetweenPlantsMock(sourcePlantId, targetPlantId);
    return [...this.storage.values()].filter(
      (r) =>
        r.sourcePlantId === sourcePlantId && r.targetPlantId === targetPlantId
    );
  }

  async findForPlantPair(
    plantAId: string,
    plantBId: string
  ): Promise<PlantRelation[]> {
    this.findForPlantPairMock(plantAId, plantBId);
    return [...this.storage.values()].filter(
      (r) =>
        (r.sourcePlantId === plantAId && r.targetPlantId === plantBId) ||
        (r.sourcePlantId === plantBId && r.targetPlantId === plantAId)
    );
  }

  async findForPlantBatch(plantIds: string[]): Promise<PlantRelation[]> {
    this.findForPlantBatchMock(plantIds);
    const set = new Set(plantIds);
    return [...this.storage.values()].filter(
      (r) => set.has(r.sourcePlantId) && set.has(r.targetPlantId)
    );
  }

  async delete(id: string, expectedVersion?: number): Promise<boolean> {
    this.deleteMock(id, expectedVersion);
    const existing = this.storage.get(id);
    if (!existing) {
      return false;
    }
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      return false;
    }
    return this.storage.delete(id);
  }

  assertSaveHasBeenCalledWith(relation: PlantRelation): void {
    expect(this.saveMock).toHaveBeenCalledWith(relation);
  }

  assertDeleteHasBeenCalledWith(id: string, expectedVersion?: number): void {
    if (expectedVersion !== undefined) {
      expect(this.deleteMock).toHaveBeenCalledWith(id, expectedVersion);
    } else {
      expect(this.deleteMock).toHaveBeenCalledWith(id, expect.anything());
    }
  }
}
