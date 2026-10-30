import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type {
  PlantRelationReadRepository,
  PlantRelationReadView,
  PlantSummaryReader
} from '../queries/index.js';
import { embedPlantSummaries, embedsPlants } from './embedPlantSummaries.js';
import type { ListPlantRelationsDto } from './interfaces/ListPlantRelationsDto.js';

export type ListPlantRelationsDependencies = {
  plantRelationReadRepository: PlantRelationReadRepository;
  plantSummaryReader: PlantSummaryReader;
};

export class ListPlantRelations {
  private readonly plantRelationReadRepository: PlantRelationReadRepository;
  private readonly plantSummaryReader: PlantSummaryReader;

  constructor({
    plantRelationReadRepository,
    plantSummaryReader
  }: ListPlantRelationsDependencies) {
    this.plantRelationReadRepository = plantRelationReadRepository;
    this.plantSummaryReader = plantSummaryReader;
  }

  async execute(
    dto?: ListPlantRelationsDto
  ): Promise<PaginatedResult<PlantRelationReadView>> {
    const options = dto?.query ?? {};
    const { include: _include, ...query } = options;

    const page = await this.plantRelationReadRepository.findAll(query);

    return {
      ...page,
      data: embedsPlants(options.include)
        ? await embedPlantSummaries(
            page.data,
            this.plantSummaryReader,
            options.include
          )
        : page.data
    };
  }
}
