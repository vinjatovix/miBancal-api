import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import type {
  FamilySummaryReader,
  PlantRelationField,
  PlantRelationReadRepository,
  PlantRelationReadView,
  PlantRelationRelation,
  PlantSummaryReader
} from '../queries/index.js';
import {
  embedFamilySummaries,
  embedsFamilies
} from './embedFamilySummaries.js';
import { embedPlantSummaries, embedsPlants } from './embedPlantSummaries.js';

export type GetPlantRelationByIdDependencies = {
  plantRelationReadRepository: PlantRelationReadRepository;
  plantSummaryReader: PlantSummaryReader;
  familySummaryReader: FamilySummaryReader;
};

export class GetPlantRelationById {
  private readonly plantRelationReadRepository: PlantRelationReadRepository;
  private readonly plantSummaryReader: PlantSummaryReader;
  private readonly familySummaryReader: FamilySummaryReader;

  constructor({
    plantRelationReadRepository,
    plantSummaryReader,
    familySummaryReader
  }: GetPlantRelationByIdDependencies) {
    this.plantRelationReadRepository = plantRelationReadRepository;
    this.plantSummaryReader = plantSummaryReader;
    this.familySummaryReader = familySummaryReader;
  }

  async execute(
    id: string,
    options?: ReadOptions<PlantRelationField, PlantRelationRelation>
  ): Promise<PlantRelationReadView> {
    const found = await this.plantRelationReadRepository.findById(id);
    const relation = ensureFound(found, 'PlantRelation', id);
    const include = options?.include;

    let view = relation;

    if (embedsPlants(include)) {
      [view = view] = await embedPlantSummaries(
        [view],
        this.plantSummaryReader,
        include
      );
    }

    if (embedsFamilies(include)) {
      [view = view] = await embedFamilySummaries(
        [view],
        this.familySummaryReader,
        include
      );
    }

    return view;
  }
}
