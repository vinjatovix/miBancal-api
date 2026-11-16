import type { PlantRelation } from '../entities/PlantRelation.js';
import { CompanionEvaluationService } from './CompanionEvaluationService.js';
import type { CropPlacement } from './types/CompanionEvaluationTypes.js';
import type {
  CompanionGraphEdge,
  CompanionScope
} from './types/CompanionGraphEdge.js';
import type { ProjectedPlant } from './types/ProjectedPlant.js';

function toCropPlacement(plant: ProjectedPlant): CropPlacement {
  return {
    id: plant.plantInstanceId,
    plantId: plant.plantId,
    scientificName: plant.scientificName,
    ...(plant.familyId !== undefined && { familyId: plant.familyId }),
    position: plant.globalPosition
  };
}

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

        edges.push(...this.evaluatePlantPair(plantA, plantB, candidateRules));
      }
    }

    return edges;
  }

  private evaluatePlantPair(
    plantA: ProjectedPlant,
    plantB: ProjectedPlant,
    candidateRules: readonly PlantRelation[]
  ): CompanionGraphEdge[] {
    const cropA = toCropPlacement(plantA);
    const cropB = toCropPlacement(plantB);

    const evaluation = this.companionEvaluationService.evaluatePair(
      cropA,
      cropB,
      candidateRules
    );

    const scope: CompanionScope =
      plantA.bedId === plantB.bedId ? 'intra_bed' : 'cross_bed';

    return evaluation.activeRelations.map((relation) => ({
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
    }));
  }
}
