import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type {
  FamilySummaryReader,
  PlantField,
  PlantReadRepository,
  PlantRelation,
  PlantSparseView
} from '../queries/index.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';
import { embedFamilySummaries, embedsFamily } from './embedFamilySummaries.js';

export type GetPlantDependencies = {
  plantReadRepository: PlantReadRepository;
  familySummaryReader: FamilySummaryReader;
};

export class GetPlant {
  private readonly plantReadRepository: PlantReadRepository;
  private readonly familySummaryReader: FamilySummaryReader;

  constructor({
    plantReadRepository,
    familySummaryReader
  }: GetPlantDependencies) {
    this.plantReadRepository = plantReadRepository;
    this.familySummaryReader = familySummaryReader;
  }

  async execute(
    idOrSlug: string,
    user: UserSessionInfo | undefined,
    options: ReadOptions<PlantField, PlantRelation> = {}
  ): Promise<PlantSparseView> {
    const { include: _include, ...readOptions } = options;
    const isUuid = UuidValidator.isValid(idOrSlug);

    let found: Nullable<PlantSparseView>;
    if (canSeeDeletedPlants(user)) {
      found = isUuid
        ? await this.plantReadRepository.findById(idOrSlug, readOptions)
        : await this.plantReadRepository.findBySlug(idOrSlug, readOptions);
    } else {
      found = isUuid
        ? await this.plantReadRepository.findActiveById(idOrSlug, readOptions)
        : await this.plantReadRepository.findActiveBySlug(
            idOrSlug,
            readOptions
          );
    }
    const plant = ensureFound(
      found,
      'Plant',
      idOrSlug,
      isUuid ? undefined : 'slug'
    );

    if (!embedsFamily(options)) return plant;

    const [embedded = plant] = await embedFamilySummaries(
      [plant],
      this.familySummaryReader
    );

    return embedded;
  }
}
