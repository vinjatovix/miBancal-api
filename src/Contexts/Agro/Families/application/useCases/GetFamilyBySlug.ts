import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import {
  cacheAside,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type {
  FamilyField,
  FamilyReadRepository,
  FamilySparseView
} from '../queries/index.js';

export type GetFamilyBySlugDependencies = {
  familyReadRepository: FamilyReadRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class GetFamilyBySlug {
  private readonly familyReadRepository: FamilyReadRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    familyReadRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: GetFamilyBySlugDependencies) {
    this.familyReadRepository = familyReadRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    slug: string,
    options: ReadOptions<FamilyField> = {}
  ): Promise<FamilySparseView> {
    const isSparseFieldRead = options.fields !== undefined;

    if (isSparseFieldRead) {
      return ensureFound(
        await this.familyReadRepository.findBySlug(slug, options),
        'Family',
        slug,
        'slug'
      );
    }

    return cacheAside(
      this.cacheRepository,
      catalogSlugKey('families', slug),
      this.cacheCatalogTtlSeconds,
      async () =>
        ensureFound(
          await this.familyReadRepository.findBySlug(slug),
          'Family',
          slug,
          'slug'
        )
    );
  }
}
