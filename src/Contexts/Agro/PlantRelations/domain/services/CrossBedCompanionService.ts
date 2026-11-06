import type { PlantRelation } from '../entities/PlantRelation.js';
import { CompanionEvaluationService } from './CompanionEvaluationService.js';
import type { CropPlacement } from './types/CompanionEvaluationTypes.js';
import type {
  CompanionGraphEdge,
  CompanionScope
} from './types/CompanionGraphEdge.js';
import type { ProjectedPlant } from './types/ProjectedPlant.js';

export class CrossBedCompanionService {
  private readonly companionEvaluationService: CompanionEvaluationService;

  constructor(companionEvaluationService?: CompanionEvaluationService) {
    this.companionEvaluationService =
      companionEvaluationService ?? new CompanionEvaluationService();
  }

  evaluateLayout(
    projectedPlants: readonly ProjectedPlant[],
    candidateRules: readonly PlantRelation[]
  ): CompanionGraphEdge[] {
    const edges: CompanionGraphEdge[] = [];

    for (let i = 0; i < projectedPlants.length; i += 1) {
      const plantA = projectedPlants[i];
      if (!plantA) continue;

      for (let j = 0; j < projectedPlants.length; j += 1) {
        if (i === j) continue;
        const plantB = projectedPlants[j];
        if (!plantB) continue;

        const cropA: CropPlacement = {
          id: plantA.plantInstanceId,
          plantId: plantA.plantId,
          scientificName: plantA.scientificName,
          ...(plantA.familyId !== undefined && { familyId: plantA.familyId }),
          position: plantA.globalPosition
        };

        const cropB: CropPlacement = {
          id: plantB.plantInstanceId,
          plantId: plantB.plantId,
          scientificName: plantB.scientificName,
          ...(plantB.familyId !== undefined && { familyId: plantB.familyId }),
          position: plantB.globalPosition
        };

        const evaluation = this.companionEvaluationService.evaluatePair(
          cropA,
          cropB,
          candidateRules
        );

        const scope: CompanionScope =
          plantA.bedId === plantB.bedId ? 'intra_bed' : 'cross_bed';

        for (const relation of evaluation.activeRelations) {
          edges.push({
            sourcePlantInstanceId: plantA.plantInstanceId,
            targetPlantInstanceId: plantB.plantInstanceId,
            sourceBedId: plantA.bedId,
            targetBedId: plantB.bedId,
            relationType: relation.type,
            mechanism: relation.mechanism,
            strength: relation.strength,
            distanceCm: evaluation.distanceCm,
            scope,
            reason: relation.reason
          });
        }
      }
    }

    return edges;
  }
}
