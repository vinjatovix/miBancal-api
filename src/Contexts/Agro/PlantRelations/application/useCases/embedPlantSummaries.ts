import type {
  PlantRelationRelation,
  PlantRelationReadView,
  PlantSummaryReader,
  PlantSummaryView
} from '../queries/index.js';

export const embedsSourcePlant = (
  include?: readonly PlantRelationRelation[]
): boolean => include?.includes('sourcePlant') ?? false;

export const embedsTargetPlant = (
  include?: readonly PlantRelationRelation[]
): boolean => include?.includes('targetPlant') ?? false;

export const embedsPlants = (
  include?: readonly PlantRelationRelation[]
): boolean => embedsSourcePlant(include) || embedsTargetPlant(include);

export const embedPlantSummaries = async (
  views: readonly PlantRelationReadView[],
  reader: PlantSummaryReader,
  include?: readonly PlantRelationRelation[]
): Promise<PlantRelationReadView[]> => {
  const includeSource = embedsSourcePlant(include);
  const includeTarget = embedsTargetPlant(include);

  if (!includeSource && !includeTarget) return [...views];

  const ids = new Set<string>();
  for (const view of views) {
    if (includeSource && view.sourcePlantId) ids.add(view.sourcePlantId);
    if (includeTarget && view.targetPlantId) ids.add(view.targetPlantId);
  }

  if (ids.size === 0) return [...views];

  const summariesList = await reader.findSummariesByIds([...ids]);
  const summaries = new Map<string, PlantSummaryView>(
    summariesList.map((s) => [s.id, s])
  );

  return views.map((view) => {
    const sourcePlant =
      includeSource && view.sourcePlantId && summaries.has(view.sourcePlantId)
        ? summaries.get(view.sourcePlantId)
        : undefined;
    const targetPlant =
      includeTarget && view.targetPlantId && summaries.has(view.targetPlantId)
        ? summaries.get(view.targetPlantId)
        : undefined;

    return {
      ...view,
      ...(sourcePlant !== undefined ? { sourcePlant } : {}),
      ...(targetPlant !== undefined ? { targetPlant } : {})
    };
  });
};
