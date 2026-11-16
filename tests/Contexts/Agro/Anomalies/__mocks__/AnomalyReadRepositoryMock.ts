/* eslint-disable @typescript-eslint/require-await */
import type {
  AnomalyField,
  AnomalyReadRepository,
  AnomalyReadView,
  AnomalySparseView
} from '../../../../../src/Contexts/Agro/Anomalies/application/queries/index.js';
import type { AnomalyFilter } from '../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyFilter.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

/**
 * In-memory read port: returns stored views as they are, or only `id` and the
 * requested fields when the read has a fieldset. `findActive*` hides soft-deleted
 * entries, and `findExistingSlugs` reports the stored ACTIVE slugs among its input.
 */
export class AnomalyReadRepositoryMock implements AnomalyReadRepository {
  private readonly findByIdMock = jest.fn();
  private readonly findActiveByIdMock = jest.fn();
  private readonly findBySlugMock = jest.fn();
  private readonly findActiveBySlugMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly findExistingSlugsMock = jest.fn();
  private readonly storage = new Map<string, AnomalyReadView>();

  async findById(
    id: string,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<Nullable<AnomalySparseView>> {
    this.findByIdMock(id, options);
    const view = this.storage.get(id);

    return view ? this.select(view, options) : null;
  }

  async findActiveById(
    id: string,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<Nullable<AnomalySparseView>> {
    this.findActiveByIdMock(id, options);
    const view = this.storage.get(id);

    return view && view.status !== 'DELETED'
      ? this.select(view, options)
      : null;
  }

  async findBySlug(
    slug: string,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<Nullable<AnomalySparseView>> {
    this.findBySlugMock(slug, options);
    const view = this.bySlug(slug);

    return view ? this.select(view, options) : null;
  }

  async findActiveBySlug(
    slug: string,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<Nullable<AnomalySparseView>> {
    this.findActiveBySlugMock(slug, options);
    const view = this.bySlug(slug);

    return view && view.status !== 'DELETED'
      ? this.select(view, options)
      : null;
  }

  async findAll(
    options?: Omit<QueryOptions<AnomalyFilter, AnomalyField>, 'include'>
  ): Promise<PaginatedResult<AnomalySparseView>> {
    this.findAllMock(options);

    const statusEq = options?.filter?.status?.eq;
    const views = [...this.storage.values()].filter((view) =>
      statusEq === undefined ? true : view.status === (statusEq as string)
    );
    const data = views.map((view) => this.select(view, options ?? {}));

    return {
      data,
      pagination: {
        page: 1,
        limit: data.length || 1,
        totalPages: data.length > 0 ? 1 : 0,
        totalItems: data.length
      }
    };
  }

  async findExistingSlugs(
    slugs: readonly string[]
  ): Promise<readonly string[]> {
    this.findExistingSlugsMock(slugs);

    const active = new Set(
      [...this.storage.values()]
        .filter((view) => view.status !== 'DELETED')
        .map((view) => view.slug)
    );

    return [...new Set(slugs)].filter((slug) => active.has(slug));
  }

  private bySlug(slug: string): AnomalyReadView | undefined {
    return [...this.storage.values()].find((view) => view.slug === slug);
  }

  private select(
    view: AnomalyReadView,
    { fields }: ReadOptions<AnomalyField>
  ): AnomalySparseView {
    if (fields === undefined) return view;

    const sparse: AnomalySparseView = { id: view.id };
    for (const field of fields) {
      if (field === 'id') continue;
      const value = view[field];
      if (value !== undefined) {
        (sparse as Record<string, unknown>)[field] = value;
      }
    }

    return sparse;
  }

  /* ---------- helpers ---------- */

  addToStorage(view: AnomalyReadView): void {
    this.storage.set(view.id, view);
  }

  /* ---------- assertions ---------- */

  assertFindBySlugHasBeenCalledWith(slug: string, options: unknown = {}): void {
    expect(this.findBySlugMock).toHaveBeenCalledWith(slug, options);
  }

  assertFindActiveBySlugHasBeenCalledWith(
    slug: string,
    options: unknown = {}
  ): void {
    expect(this.findActiveBySlugMock).toHaveBeenCalledWith(slug, options);
  }

  assertFindAllHasBeenCalledWith(options: unknown): void {
    expect(this.findAllMock).toHaveBeenCalledWith(options);
  }

  assertFindExistingSlugsHasBeenCalledWith(slugs: readonly string[]): void {
    expect(this.findExistingSlugsMock).toHaveBeenCalledWith(slugs);
  }
}
