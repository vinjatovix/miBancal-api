/* eslint-disable @typescript-eslint/require-await */
import type {
  GardenInputField,
  GardenInputReadRepository,
  GardenInputReadView,
  GardenInputSparseView
} from '../../../../../src/Contexts/Agro/GardenInputs/application/queries/index.js';
import type { GardenInputFilter } from '../../../../../src/Contexts/Agro/GardenInputs/domain/entities/types/GardenInputFilter.js';
import type { PaginatedResult } from '../../../../../src/shared/domain/query/interfaces/PaginatedResult.js';
import type {
  QueryOptions,
  ReadOptions
} from '../../../../../src/shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

const matchesStatus = (status: string, expected?: string): boolean =>
  expected === undefined || status === expected;

const matchesCategory = (category: string, expected?: string): boolean =>
  expected === undefined || category === expected;

const matchesAction = (
  actions: readonly string[] | undefined,
  expected?: string
): boolean =>
  expected === undefined ||
  (actions !== undefined && actions.includes(expected));

export class GardenInputReadRepositoryMock implements GardenInputReadRepository {
  private readonly findByIdMock = jest.fn();
  private readonly findActiveByIdMock = jest.fn();
  private readonly findBySlugMock = jest.fn();
  private readonly findActiveBySlugMock = jest.fn();
  private readonly findAllMock = jest.fn();
  private readonly findExistingSlugsMock = jest.fn();
  private readonly storage = new Map<string, GardenInputReadView>();

  async findById(
    id: string,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<Nullable<GardenInputSparseView>> {
    this.findByIdMock(id, options);
    const view = this.storage.get(id);

    return view ? this.select(view, options) : null;
  }

  async findActiveById(
    id: string,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<Nullable<GardenInputSparseView>> {
    this.findActiveByIdMock(id, options);
    const view = this.storage.get(id);

    return view && view.status !== 'deleted'
      ? this.select(view, options)
      : null;
  }

  async findBySlug(
    slug: string,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<Nullable<GardenInputSparseView>> {
    this.findBySlugMock(slug, options);
    const view = this.bySlug(slug);

    return view ? this.select(view, options) : null;
  }

  async findActiveBySlug(
    slug: string,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<Nullable<GardenInputSparseView>> {
    this.findActiveBySlugMock(slug, options);
    const view = this.bySlug(slug);

    return view && view.status !== 'deleted'
      ? this.select(view, options)
      : null;
  }

  private matchesFilter(
    view: GardenInputReadView,
    filter?: GardenInputFilter
  ): boolean {
    if (!filter) return true;
    return (
      matchesStatus(view.status, filter.status?.eq) &&
      matchesCategory(view.category, filter.category?.eq) &&
      matchesAction(view.actions, filter.action?.eq)
    );
  }

  async findAll(
    options?: Omit<QueryOptions<GardenInputFilter, GardenInputField>, 'include'>
  ): Promise<PaginatedResult<GardenInputSparseView>> {
    this.findAllMock(options);

    const views = [...this.storage.values()].filter((view) =>
      this.matchesFilter(view, options?.filter)
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
        .filter((view) => view.status !== 'deleted')
        .map((view) => view.slug)
    );

    return [...new Set(slugs)].filter((slug) => active.has(slug));
  }

  private bySlug(slug: string): GardenInputReadView | undefined {
    return [...this.storage.values()].find((view) => view.slug === slug);
  }

  private select(
    view: GardenInputReadView,
    { fields }: ReadOptions<GardenInputField>
  ): GardenInputSparseView {
    if (fields === undefined) return view;

    const sparse: GardenInputSparseView = { id: view.id };
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

  addToStorage(view: GardenInputReadView): void {
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
