import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { PlantReadRepository } from '../../../Plants/application/queries/index.js';
import type {
  AppliesToScope,
  PlantRelationFilter
} from '../../domain/entities/types/PlantRelationFilter.js';
import type {
  FamilySummaryReader,
  PlantRelationReadRepository,
  PlantRelationReadView,
  PlantSummaryReader
} from '../queries/index.js';
import {
  embedFamilySummaries,
  embedsFamilies
} from './embedFamilySummaries.js';
import { embedPlantSummaries, embedsPlants } from './embedPlantSummaries.js';
import type { ListPlantRelationsDto } from './interfaces/ListPlantRelationsDto.js';
import { annotateAppliesTo, deriveGenus } from './resolveAppliesTo.js';

export type ListPlantRelationsDependencies = {
  plantRelationReadRepository: PlantRelationReadRepository;
  plantSummaryReader: PlantSummaryReader;
  familySummaryReader: FamilySummaryReader;
  plantReadRepository: PlantReadRepository;
};

export class ListPlantRelations {
  private readonly plantRelationReadRepository: PlantRelationReadRepository;
  private readonly plantSummaryReader: PlantSummaryReader;
  private readonly familySummaryReader: FamilySummaryReader;
  private readonly plantReadRepository: PlantReadRepository;

  constructor({
    plantRelationReadRepository,
    plantSummaryReader,
    familySummaryReader,
    plantReadRepository
  }: ListPlantRelationsDependencies) {
    this.plantRelationReadRepository = plantRelationReadRepository;
    this.plantSummaryReader = plantSummaryReader;
    this.familySummaryReader = familySummaryReader;
    this.plantReadRepository = plantReadRepository;
  }

  async execute(
    dto?: ListPlantRelationsDto
  ): Promise<PaginatedResult<PlantRelationReadView>> {
    const options = dto?.query ?? {};
    const { include, filter, ...rest } = options;

    const appliesTo = await this.resolveAppliesTo(filter?.appliesToPlantId?.eq);
    const resolvedFilter = this.withAppliesTo(filter, appliesTo);

    const page = await this.plantRelationReadRepository.findAll({
      ...rest,
      ...(resolvedFilter !== undefined ? { filter: resolvedFilter } : {})
    });

    const withPlants = embedsPlants(include)
      ? await embedPlantSummaries(page.data, this.plantSummaryReader, include)
      : page.data;

    const embedded = embedsFamilies(include)
      ? await embedFamilySummaries(
          withPlants,
          this.familySummaryReader,
          include
        )
      : withPlants;

    const data =
      appliesTo !== undefined
        ? embedded.map((view) => annotateAppliesTo(view, appliesTo))
        : embedded;

    return { ...page, data };
  }

  /**
   * Expands `appliesToPlantId` into the taxonomic coordinates a relation can
   * match the plant by: its id, the genus derived from its scientific name and
   * its family. An unknown plant still resolves to its id, so the query matches
   * the plant and broadcast tiers rather than failing.
   */
  private async resolveAppliesTo(
    plantId?: string
  ): Promise<AppliesToScope | undefined> {
    if (!plantId) return undefined;

    const normalizedId = plantId.toLowerCase();
    const plant = await this.plantReadRepository.findActiveById(plantId, {
      fields: ['identity']
    });

    if (!plant?.identity) return { plantId: normalizedId };

    const genus = deriveGenus(plant.identity.scientificName);
    const familyId =
      typeof plant.identity.family === 'string'
        ? plant.identity.family
        : plant.identity.family?.id;

    return {
      plantId: normalizedId,
      ...(genus !== undefined ? { genus } : {}),
      ...(familyId ? { familyId } : {})
    };
  }

  private withAppliesTo(
    filter: PlantRelationFilter | undefined,
    appliesTo: AppliesToScope | undefined
  ): PlantRelationFilter | undefined {
    if (filter === undefined) {
      return appliesTo !== undefined ? { appliesTo } : undefined;
    }

    const { appliesToPlantId: _appliesToPlantId, ...rest } = filter;

    return appliesTo !== undefined ? { ...rest, appliesTo } : rest;
  }
}
