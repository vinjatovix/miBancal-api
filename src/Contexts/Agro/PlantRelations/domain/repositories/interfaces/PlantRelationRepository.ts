import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { PlantRelation } from '../../entities/PlantRelation.js';

export interface PlantRelationRepository {
  save(relation: PlantRelation): Promise<void>;
  findById(id: string): Promise<Nullable<PlantRelation>>;
  findBySourcePlant(sourcePlantId: string): Promise<PlantRelation[]>;
  findByTargetPlant(targetPlantId: string): Promise<PlantRelation[]>;
  findBetweenPlants(
    sourcePlantId: string,
    targetPlantId: string
  ): Promise<PlantRelation[]>;
  findForPlantPair(
    plantAId: string,
    plantBId: string
  ): Promise<PlantRelation[]>;
  findForPlantBatch(plantIds: string[]): Promise<PlantRelation[]>;
  delete(id: string): Promise<boolean>;
}
