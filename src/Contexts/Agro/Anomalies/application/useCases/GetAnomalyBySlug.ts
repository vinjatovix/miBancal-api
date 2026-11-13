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
  AnomalyField,
  AnomalyReadRepository,
  AnomalySparseView
} from '../queries/index.js';
import { canSeeDeletedAnomalies } from './canSeeDeletedAnomalies.js';

export type GetAnomalyBySlugDependencies = {
  anomalyReadRepository: AnomalyReadRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class GetAnomalyBySlug {
  private readonly anomalyReadRepository: AnomalyReadRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    anomalyReadRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: GetAnomalyBySlugDependencies) {
    this.anomalyReadRepository = anomalyReadRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    idOrSlug: string,
    user: UserSessionInfo | undefined,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<AnomalySparseView> {
    const isPrivilegedRead = canSeeDeletedAnomalies(user);
    const isSparseFieldRead = options.fields !== undefined;
    const shouldBypassCatalogCache = isPrivilegedRead || isSparseFieldRead;
    const byId = UuidValidator.isValid(idOrSlug);

    if (shouldBypassCatalogCache) {
      return ensureFound(
        await this.readFor(idOrSlug, byId, isPrivilegedRead, options),
        'Anomaly',
        idOrSlug,
        byId ? undefined : 'slug'
      );
    }

    const key = byId
      ? catalogIdKey('anomalies', idOrSlug)
      : catalogSlugKey('anomalies', idOrSlug);

    return cacheAside(
      this.cacheRepository,
      key,
      this.cacheCatalogTtlSeconds,
      async () =>
        ensureFound(
          await this.readFor(idOrSlug, byId, false, {}),
          'Anomaly',
          idOrSlug,
          byId ? undefined : 'slug'
        )
    );
  }

  private readFor(
    idOrSlug: string,
    byId: boolean,
    canSeeDeleted: boolean,
    options: ReadOptions<AnomalyField>
  ): Promise<AnomalySparseView | null> {
    if (byId) {
      return canSeeDeleted
        ? this.anomalyReadRepository.findById(idOrSlug, options)
        : this.anomalyReadRepository.findActiveById(idOrSlug, options);
    }
    return canSeeDeleted
      ? this.anomalyReadRepository.findBySlug(idOrSlug, options)
      : this.anomalyReadRepository.findActiveBySlug(idOrSlug, options);
  }
}
