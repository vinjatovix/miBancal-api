import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import {
  cacheAside,
  catalogIdKey,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type {
  GardenInputField,
  GardenInputReadRepository,
  GardenInputSparseView
} from '../queries/index.js';
import { canSeeDeletedGardenInputs } from './canSeeDeletedGardenInputs.js';

export type GetGardenInputByIdOrSlugDependencies = {
  gardenInputReadRepository: GardenInputReadRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class GetGardenInputByIdOrSlug {
  private readonly gardenInputReadRepository: GardenInputReadRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    gardenInputReadRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: GetGardenInputByIdOrSlugDependencies) {
    this.gardenInputReadRepository = gardenInputReadRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    idOrSlug: string,
    user: UserSessionInfo | undefined,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<GardenInputSparseView> {
    const isPrivilegedRead = canSeeDeletedGardenInputs(user);
    const isSparseFieldRead = options.fields !== undefined;
    const shouldBypassCatalogCache = isPrivilegedRead || isSparseFieldRead;
    const byId = UuidValidator.isValid(idOrSlug);

    if (shouldBypassCatalogCache) {
      return ensureFound(
        await this.readFor(idOrSlug, byId, isPrivilegedRead, options),
        'GardenInput',
        idOrSlug,
        byId ? undefined : 'slug'
      );
    }

    const key = byId
      ? catalogIdKey('gardenInputs', idOrSlug)
      : catalogSlugKey('gardenInputs', idOrSlug);

    return cacheAside(
      this.cacheRepository,
      key,
      this.cacheCatalogTtlSeconds,
      async () =>
        ensureFound(
          await this.readFor(idOrSlug, byId, false, {}),
          'GardenInput',
          idOrSlug,
          byId ? undefined : 'slug'
        )
    );
  }

  private readFor(
    idOrSlug: string,
    byId: boolean,
    canSeeDeleted: boolean,
    options: ReadOptions<GardenInputField>
  ): Promise<GardenInputSparseView | null> {
    if (byId) {
      return canSeeDeleted
        ? this.gardenInputReadRepository.findById(idOrSlug, options)
        : this.gardenInputReadRepository.findActiveById(idOrSlug, options);
    }
    return canSeeDeleted
      ? this.gardenInputReadRepository.findBySlug(idOrSlug, options)
      : this.gardenInputReadRepository.findActiveBySlug(idOrSlug, options);
  }
}
