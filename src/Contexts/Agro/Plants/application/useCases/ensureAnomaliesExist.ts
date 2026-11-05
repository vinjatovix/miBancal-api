import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { AnomalyReadRepository } from '../../../Anomalies/application/queries/index.js';

/**
 * Every referenced anomaly slug must exist in the catalog (FR-014). Validated
 * with a single indexed `$in`; an unknown slug rejects the whole plant write.
 * `null`/`undefined`/empty (a clear or an absent field) needs no lookup.
 */
export const ensureAnomaliesExist = async (
  anomalyReadRepository: AnomalyReadRepository,
  slugs: readonly string[] | null | undefined
): Promise<void> => {
  if (slugs === undefined || slugs === null) return;

  const unique = [
    ...new Set(
      slugs.map((slug) => slug.trim().toLowerCase()).filter((slug) => slug)
    )
  ];
  if (unique.length === 0) return;

  const existing = new Set(
    await anomalyReadRepository.findExistingSlugs(unique)
  );
  const missing = unique.filter((slug) => !existing.has(slug));

  if (missing.length > 0) {
    throw new InvalidArgumentException(
      `Unknown anomaly slugs: ${missing.join(', ')}`
    );
  }
};
