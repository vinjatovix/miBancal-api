import type { PlantRelation } from '../entities/PlantRelation.js';
import type { PlantRelationMechanism } from '../entities/types/PlantRelationMechanism.js';
import { extractBotanicalGenus } from './extractBotanicalGenus.js';
import type {
  CompanionEvaluationResult,
  CropPlacement,
  ResolvedCompanionInteraction,
  TaxonomicTier
} from './types/CompanionEvaluationTypes.js';

type ScoredMatch = {
  readonly rule: PlantRelation;
  readonly score: number;
  readonly tier: TaxonomicTier;
};

type Specificity = { readonly score: number; readonly tier: TaxonomicTier };

const SPECIFICITY_BY_SCOPES: Readonly<Record<string, Specificity>> = {
  'plant:plant': { score: 100, tier: 'species' },
  'plant:genus': { score: 80, tier: 'genus' },
  'genus:plant': { score: 80, tier: 'genus' },
  'genus:genus': { score: 70, tier: 'genus' },
  'plant:family': { score: 60, tier: 'family' },
  'family:plant': { score: 60, tier: 'family' },
  'genus:family': { score: 50, tier: 'family' },
  'family:genus': { score: 50, tier: 'family' },
  'family:family': { score: 40, tier: 'family' },
  'plant:all': { score: 30, tier: 'broadcast' },
  'genus:all': { score: 20, tier: 'broadcast' },
  'family:all': { score: 10, tier: 'broadcast' }
};

const NO_SPECIFICITY: Specificity = { score: 0, tier: 'broadcast' };

const computeSpecificity = (
  sourceScope: string,
  targetScope: string
): Specificity =>
  SPECIFICITY_BY_SCOPES[`${sourceScope}:${targetScope}`] ?? NO_SPECIFICITY;

export class CompanionEvaluationService {
  evaluatePair(
    cropA: CropPlacement,
    cropB: CropPlacement,
    candidateRules: readonly PlantRelation[]
  ): CompanionEvaluationResult {
    if (cropA.id === cropB.id) {
      return {
        influencerCropId: cropA.id,
        affectedCropId: cropB.id,
        distanceCm: 0,
        activeRelations: [],
        shadowedRulesCount: 0
      };
    }

    const dx = cropB.position.x - cropA.position.x;
    const dy = cropB.position.y - cropA.position.y;
    const distanceCm = Math.round(Math.hypot(dx, dy) * 100) / 100;

    const genusA = extractBotanicalGenus(cropA.scientificName);
    const genusB = extractBotanicalGenus(cropB.scientificName);

    const matchesByMechanism = new Map<PlantRelationMechanism, ScoredMatch[]>();

    for (const rule of candidateRules) {
      if (!this.ruleApplies(rule, cropA, cropB, distanceCm, [genusA, genusB])) {
        continue;
      }

      const { score, tier } = computeSpecificity(
        rule.source.scope,
        rule.target.scope
      );

      const match: ScoredMatch = { rule, score, tier };
      const group = matchesByMechanism.get(rule.mechanism) ?? [];
      group.push(match);
      matchesByMechanism.set(rule.mechanism, group);
    }

    const activeRelations: ResolvedCompanionInteraction[] = [];
    let shadowedRulesCount = 0;

    for (const matches of matchesByMechanism.values()) {
      matches.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.rule.id.localeCompare(b.rule.id);
      });

      const governing = matches[0];
      if (!governing) {
        continue;
      }

      activeRelations.push({
        relationId: governing.rule.id,
        source: governing.rule.source.toPrimitives(),
        target: governing.rule.target.toPrimitives(),
        type: governing.rule.type,
        mechanism: governing.rule.mechanism,
        strength: governing.rule.strength,
        tier: governing.tier,
        specificityScore: governing.score,
        reason: governing.rule.reason
      });

      shadowedRulesCount += matches.length - 1;
    }

    return {
      influencerCropId: cropA.id,
      affectedCropId: cropB.id,
      distanceCm,
      activeRelations,
      shadowedRulesCount
    };
  }

  evaluateBed(
    crops: readonly CropPlacement[],
    candidateRules: readonly PlantRelation[]
  ): CompanionEvaluationResult[] {
    const results: CompanionEvaluationResult[] = [];

    for (let i = 0; i < crops.length; i++) {
      const cropI = crops[i];
      if (!cropI) continue;

      for (let j = 0; j < crops.length; j++) {
        if (i === j) continue;
        const cropJ = crops[j];
        if (!cropJ) continue;

        const result = this.evaluatePair(cropI, cropJ, candidateRules);
        if (result.activeRelations.length > 0) {
          results.push(result);
        }
      }
    }

    return results;
  }

  private ruleApplies(
    rule: PlantRelation,
    cropA: CropPlacement,
    cropB: CropPlacement,
    distanceCm: number,
    [genusA, genusB]: readonly [string | null, string | null]
  ): boolean {
    if (!rule.proximity.isWithinRange(distanceCm)) return false;
    if (rule.target.isAll() && cropA.plantId === cropB.plantId) return false;

    return (
      this.matchesSource(rule, cropA.plantId, genusA, cropA.familyId) &&
      this.matchesTarget(rule, cropB.plantId, genusB, cropB.familyId)
    );
  }

  private matchesSource(
    rule: PlantRelation,
    plantId: string,
    genus: string | null,
    familyId?: string
  ): boolean {
    if (rule.source.isPlant()) {
      return rule.source.value === plantId;
    }
    if (rule.source.isGenus()) {
      return (
        genus !== null &&
        rule.source.value?.toLowerCase() === genus.toLowerCase()
      );
    }
    if (rule.source.isFamily()) {
      return familyId !== undefined && rule.source.value === familyId;
    }
    return false;
  }

  private matchesTarget(
    rule: PlantRelation,
    plantId: string,
    genus: string | null,
    familyId?: string
  ): boolean {
    if (rule.target.isAll()) {
      return true;
    }
    if (rule.target.isPlant()) {
      return rule.target.value === plantId;
    }
    if (rule.target.isGenus()) {
      return (
        genus !== null &&
        rule.target.value?.toLowerCase() === genus.toLowerCase()
      );
    }
    if (rule.target.isFamily()) {
      return familyId !== undefined && rule.target.value === familyId;
    }
    return false;
  }
}
