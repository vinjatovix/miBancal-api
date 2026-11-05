import { deriveGenus } from '../../../../../shared/domain/utils/deriveGenus.js';
import type { AppliesToScope } from '../../domain/entities/types/PlantRelationFilter.js';
import type {
  TaxonomicScopePrimitives,
  TaxonomicSourceScopePrimitives
} from '../../domain/valueObjects/types/TaxonomicScopePrimitives.js';
import type {
  AppliesRole,
  AppliesVia,
  PlantRelationReadView
} from '../queries/index.js';

// The genus derivation is a shared botanical rule (plant catalog and relations
// derive it identically); re-exported so existing importers keep their path.
export { deriveGenus };

/** Narrower tiers shadow broader ones; a tie between sides is won by `target`. */
const SPECIFICITY: Record<AppliesVia, number> = {
  plant: 3,
  genus: 2,
  family: 1,
  all: 0
};

const sameId = (a: string | undefined, b: string | undefined): boolean =>
  a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();

const matchVia = (
  scope: TaxonomicSourceScopePrimitives | TaxonomicScopePrimitives,
  appliesTo: AppliesToScope
): AppliesVia | undefined => {
  switch (scope.scope) {
    case 'plant':
      return sameId(scope.value, appliesTo.plantId) ? 'plant' : undefined;
    case 'genus':
      return scope.value === appliesTo.genus ? 'genus' : undefined;
    case 'family':
      return sameId(scope.value, appliesTo.familyId) ? 'family' : undefined;
    case 'all':
      return 'all';
    default:
      return undefined;
  }
};

/**
 * Tags a relation with the tier (`appliesVia`) and side (`role`) through which
 * the queried plant matched. Every relation returned by an `appliesToPlantId`
 * query matches at least one side, so `via`/`role` are always resolved; on the
 * unexpected miss the view is returned unchanged.
 */
export const annotateAppliesTo = (
  view: PlantRelationReadView,
  appliesTo: AppliesToScope
): PlantRelationReadView => {
  const sourceVia = matchVia(view.source, appliesTo);
  const targetVia = matchVia(view.target, appliesTo);

  let via: AppliesVia | undefined;
  let role: AppliesRole | undefined;

  if (sourceVia !== undefined) {
    via = sourceVia;
    role = 'source';
  }

  if (
    targetVia !== undefined &&
    (via === undefined || SPECIFICITY[targetVia] >= SPECIFICITY[via])
  ) {
    via = targetVia;
    role = 'target';
  }

  if (via === undefined || role === undefined) return view;

  return { ...view, appliesVia: via, role };
};
