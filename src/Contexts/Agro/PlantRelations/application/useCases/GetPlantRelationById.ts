import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type {
  PlantRelationField,
  PlantRelationReadRepository,
  PlantRelationReadView,
  PlantRelationRelation,
  PlantSummaryReader
} from '../queries/index.js';
import { embedPlantSummaries, embedsPlants } from './embedPlantSummaries.js';

export type GetPlantRelationByIdDependencies = {
  plantRelationReadRepository: PlantRelationReadRepository;
  plantSummaryReader: PlantSummaryReader;
};

export class GetPlantRelationById {
  private readonly plantRelationReadRepository: PlantRelationReadRepository;
  private readonly plantSummaryReader: PlantSummaryReader;

  constructor({
    plantRelationReadRepository,
    plantSummaryReader
  }: GetPlantRelationByIdDependencies) {
    this.plantRelationReadRepository = plantRelationReadRepository;
    this.plantSummaryReader = plantSummaryReader;
  }

  async execute(
    id: string,
    options?: ReadOptions<PlantRelationField, PlantRelationRelation>
  ): Promise<PlantRelationReadView> {
    const found = await this.plantRelationReadRepository.findById(id);
    const relation = ensureFound(found, 'PlantRelation', id);

    if (!embedsPlants(options?.include)) {
      return relation;
    }

    const [embedded = relation] = await embedPlantSummaries(
      [relation],
      this.plantSummaryReader,
      options?.include
    );

    return embedded;
  }
}
