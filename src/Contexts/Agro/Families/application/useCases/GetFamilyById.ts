import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import {
  cacheAside,
  catalogIdKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type {
  FamilyField,
  FamilyReadRepository,
  FamilySparseView
} from '../queries/index.js';

export type GetFamilyByIdDependencies = {
  familyReadRepository: FamilyReadRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class GetFamilyById {
  private readonly familyReadRepository: FamilyReadRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    familyReadRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: GetFamilyByIdDependencies) {
    this.familyReadRepository = familyReadRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    id: string,
    options: ReadOptions<FamilyField> = {}
  ): Promise<FamilySparseView> {
    const isSparseFieldRead = options.fields !== undefined;

    if (isSparseFieldRead) {
      return ensureFound(
        await this.familyReadRepository.findById(id, options),
        'Family',
        id
      );
    }

    return cacheAside(
      this.cacheRepository,
      catalogIdKey('families', id),
      this.cacheCatalogTtlSeconds,
      async () =>
        ensureFound(await this.familyReadRepository.findById(id), 'Family', id)
    );
  }
}
