import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import {
  cacheAside,
  catalogListKey,
  catalogNamespace,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import type {
  FamilyReadRepository,
  FamilySparseView
} from '../queries/index.js';
import type { ListFamiliesDto } from './interfaces/ListFamiliesDto.js';

export type ListFamiliesDependencies = {
  familyReadRepository: FamilyReadRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class ListFamilies {
  private readonly familyReadRepository: FamilyReadRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    familyReadRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: ListFamiliesDependencies) {
    this.familyReadRepository = familyReadRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    dto?: ListFamiliesDto
  ): Promise<PaginatedResult<FamilySparseView>> {
    const query = dto?.query ?? {};
    const generation = await this.cacheRepository.currentGeneration(
      catalogNamespace('families')
    );
    const key = catalogListKey('families', generation, query);

    return cacheAside(
      this.cacheRepository,
      key,
      this.cacheCatalogTtlSeconds,
      () => this.familyReadRepository.findAll(dto?.query)
    );
  }
}
