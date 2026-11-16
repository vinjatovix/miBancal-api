import type {
  FamilySummaryReader,
  FamilySummaryView,
  PlantRelationReadView,
  PlantRelationRelation
} from '../queries/index.js';

export const embedsSourceFamily = (
  include?: readonly PlantRelationRelation[]
): boolean => include?.includes('sourceFamily') ?? false;

export const embedsTargetFamily = (
  include?: readonly PlantRelationRelation[]
): boolean => include?.includes('targetFamily') ?? false;

export const embedsFamilies = (
  include?: readonly PlantRelationRelation[]
): boolean => embedsSourceFamily(include) || embedsTargetFamily(include);

const familyIdOf = (
  scope: { scope: string; value?: string | undefined },
  wanted: boolean
): string | undefined =>
  wanted && scope.scope === 'family' && scope.value ? scope.value : undefined;

/**
 * Embeds the family summary (`{ id, name, slug }`) named by a relation's
 * `source`/`target` when its scope is `family` and the relation is included.
 * Genus scopes carry their own label in `value`, so they need no reader.
 */
export const embedFamilySummaries = async (
  views: readonly PlantRelationReadView[],
  reader: FamilySummaryReader,
  include?: readonly PlantRelationRelation[]
): Promise<PlantRelationReadView[]> => {
  const includeSource = embedsSourceFamily(include);
  const includeTarget = embedsTargetFamily(include);

  if (!includeSource && !includeTarget) return [...views];

  const ids = new Set<string>();
  for (const view of views) {
    const source = familyIdOf(view.source, includeSource);
    const target = familyIdOf(view.target, includeTarget);
    if (source) ids.add(source);
    if (target) ids.add(target);
  }

  if (ids.size === 0) return [...views];

  const entries = await Promise.all(
    [...ids].map(async (id) => [id, await reader.findById(id)] as const)
  );
  const summaries = new Map<string, FamilySummaryView>();
  for (const [id, summary] of entries) {
    if (summary) summaries.set(id, summary);
  }

  return views.map((view) => {
    const sourceId = familyIdOf(view.source, includeSource);
    const targetId = familyIdOf(view.target, includeTarget);
    const sourceFamily = sourceId ? summaries.get(sourceId) : undefined;
    const targetFamily = targetId ? summaries.get(targetId) : undefined;

    return {
      ...view,
      ...(sourceFamily !== undefined ? { sourceFamily } : {}),
      ...(targetFamily !== undefined ? { targetFamily } : {})
    };
  });
};
