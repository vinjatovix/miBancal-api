import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { AnomalyReadRepository } from '../queries/index.js';

/**
 * Every `confusedWith` slug must name an existing ACTIVE anomaly (FR-015).
 * Validated with a single indexed `$in` as a non-transactional pre-check; an
 * unknown slug rejects the whole write. `null`/`undefined`/empty (a clear or an
 * absent field) needs no lookup, and the entry's own slug is dropped before the
 * check — a self-reference is never looked up and never rejected.
 */
export const ensureConfusedWithExist = async (
  anomalyReadRepository: AnomalyReadRepository,
  slugs: readonly string[] | null | undefined,
  ownSlug: string
): Promise<void> => {
  if (slugs === undefined || slugs === null) return;

  const own = ownSlug.trim().toLowerCase();
  const unique = [
    ...new Set(
      slugs
        .map((slug) => slug.trim().toLowerCase())
        .filter((slug) => slug && slug !== own)
    )
  ];
  if (unique.length === 0) return;

  const existing = new Set(
    await anomalyReadRepository.findExistingSlugs(unique)
  );
  const missing = unique.filter((slug) => !existing.has(slug));

  if (missing.length > 0) {
    throw new InvalidArgumentException(
      `Unknown confusedWith slugs: ${missing.join(', ')}`
    );
  }
};
