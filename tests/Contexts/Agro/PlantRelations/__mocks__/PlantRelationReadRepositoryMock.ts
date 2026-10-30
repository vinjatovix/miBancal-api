/* eslint-disable @typescript-eslint/require-await */
import type {
  PlantRelationField,
  PlantRelationReadRepository,
  PlantRelationReadView
} from '../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import type { PlantRelationFilter } from '../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationFilter.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

export class PlantRelationReadRepositoryMock implements PlantRelationReadRepository {
  readonly findByIdMock = jest.fn();
  readonly findAllMock = jest.fn();

  private readonly storage = new Map<string, PlantRelationReadView>();

  populate(views: readonly PlantRelationReadView[]): void {
    for (const view of views) {
      this.storage.set(view.id, view);
    }
  }

  async findById(id: string): Promise<Nullable<PlantRelationReadView>> {
    this.findByIdMock(id);
    return this.storage.get(id) ?? null;
  }

  async findAll(
    options?: Omit<
      QueryOptions<PlantRelationFilter, PlantRelationField>,
      'include'
    >
  ): Promise<PaginatedResult<PlantRelationReadView>> {
    this.findAllMock(options);

    let items = [...this.storage.values()];
    const filter = options?.filter;

    if (filter) {
      items = this.applyFilters(items, filter);
    }

    const page = options?.pagination?.page ?? 1;
    const limit = options?.pagination?.limit ?? 25;
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const data = items.slice((page - 1) * limit, page * limit);

    return {
      data,
      pagination: {
        page,
        limit,
        totalPages,
        totalItems
      }
    };
  }

  private applyFilters(
    items: PlantRelationReadView[],
    filter: PlantRelationFilter
  ): PlantRelationReadView[] {
    let filtered = items;
    filtered = this.applySourceAndTargetFilters(filtered, filter);
    filtered = this.applyOtherFilters(filtered, filter);
    return filtered;
  }

  private applySourceAndTargetFilters(
    items: PlantRelationReadView[],
    filter: PlantRelationFilter
  ): PlantRelationReadView[] {
    let filtered = items;
    if (filter.sourcePlantId?.eq) {
      filtered = filtered.filter(
        (r) =>
          r.sourcePlantId === filter.sourcePlantId?.eq ||
          (r.source.scope === 'plant' &&
            r.source.value === filter.sourcePlantId?.eq)
      );
    }
    if (filter.targetPlantId?.eq) {
      filtered = filtered.filter(
        (r) =>
          r.targetPlantId === filter.targetPlantId?.eq ||
          (r.target.scope === 'plant' &&
            r.target.value === filter.targetPlantId?.eq)
      );
    }
    if (filter.plantId?.eq) {
      const pid = filter.plantId.eq;
      filtered = filtered.filter(
        (r) =>
          (r.source.scope === 'plant' && r.source.value === pid) ||
          (r.target.scope === 'plant' && r.target.value === pid) ||
          r.sourcePlantId === pid ||
          r.targetPlantId === pid
      );
    }
    return filtered;
  }

  private applyOtherFilters(
    items: PlantRelationReadView[],
    filter: PlantRelationFilter
  ): PlantRelationReadView[] {
    let filtered = items;
    if (filter.sourceScope?.eq) {
      filtered = filtered.filter(
        (r) => r.source.scope === filter.sourceScope?.eq
      );
    }
    if (filter.targetScope?.eq) {
      filtered = filtered.filter(
        (r) => r.target.scope === filter.targetScope?.eq
      );
    }
    return this.applyTaxonFilters(filtered, filter);
  }

  private applyTaxonFilters(
    items: PlantRelationReadView[],
    filter: PlantRelationFilter
  ): PlantRelationReadView[] {
    let filtered = items;
    if (filter.genus?.eq) {
      const g = filter.genus.eq.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.source.scope === 'genus' && r.source.value?.toLowerCase() === g) ||
          (r.target.scope === 'genus' && r.target.value?.toLowerCase() === g)
      );
    }
    if (filter.familyId?.eq) {
      const fam = filter.familyId.eq;
      filtered = filtered.filter(
        (r) =>
          (r.source.scope === 'family' && r.source.value === fam) ||
          (r.target.scope === 'family' && r.target.value === fam)
      );
    }
    if (filter.type?.eq) {
      filtered = filtered.filter((r) => r.type === filter.type?.eq);
    }
    if (filter.mechanism?.eq) {
      filtered = filtered.filter((r) => r.mechanism === filter.mechanism?.eq);
    }
    return filtered;
  }

  assertFindByIdHasBeenCalledWith(id: string): void {
    expect(this.findByIdMock).toHaveBeenCalledWith(id);
  }

  assertFindAllHasBeenCalled(): void {
    expect(this.findAllMock).toHaveBeenCalled();
  }
}
