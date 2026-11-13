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
  readonly findApplicableForTaxaMock = jest.fn();
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
        existing.source.scope === relation.source.scope &&
        existing.source.value === relation.source.value &&
        existing.target.scope === relation.target.scope &&
        existing.target.value === relation.target.value &&
        existing.mechanism === relation.mechanism
      ) {
        throw new DomainConflictException(
          `PlantRelation already exists between source '${relation.source.value ?? relation.source.scope}' and target '${relation.target.value ?? relation.target.scope}' with mechanism '${relation.mechanism}'`
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
    return [...this.storage.values()].filter((r) =>
      Boolean(
        r.sourcePlantId &&
        set.has(r.sourcePlantId) &&
        r.targetPlantId &&
        set.has(r.targetPlantId)
      )
    );
  }

  async findApplicableForTaxa(criteria: {
    readonly plantIds: readonly string[];
    readonly genera: readonly string[];
    readonly familyIds: readonly string[];
  }): Promise<PlantRelation[]> {
    this.findApplicableForTaxaMock(criteria);
    const plantSet = new Set(criteria.plantIds);
    const genusSet = new Set(criteria.genera.map((g) => g.toLowerCase()));
    const familySet = new Set(criteria.familyIds);

    const matchesSource = (rel: PlantRelation): boolean => {
      if (rel.source.isPlant() && rel.source.value) {
        return plantSet.has(rel.source.value);
      }
      if (rel.source.isGenus() && rel.source.value) {
        return genusSet.has(rel.source.value.toLowerCase());
      }
      if (rel.source.isFamily() && rel.source.value) {
        return familySet.has(rel.source.value);
      }
      return false;
    };

    const matchesTarget = (rel: PlantRelation): boolean => {
      if (rel.target.isAll()) {
        return true;
      }
      if (rel.target.isPlant() && rel.target.value) {
        return plantSet.has(rel.target.value);
      }
      if (rel.target.isGenus() && rel.target.value) {
        return genusSet.has(rel.target.value.toLowerCase());
      }
      if (rel.target.isFamily() && rel.target.value) {
        return familySet.has(rel.target.value);
      }
      return false;
    };

    return [...this.storage.values()].filter(
      (r) => matchesSource(r) && matchesTarget(r)
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
