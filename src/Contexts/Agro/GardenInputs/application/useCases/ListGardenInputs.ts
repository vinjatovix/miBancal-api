import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import type { GardenInputFilter } from '../../domain/entities/types/GardenInputFilter.js';
import type {
  GardenInputReadRepository,
  GardenInputSparseView
} from '../queries/index.js';
import { canSeeDeletedGardenInputs } from './canSeeDeletedGardenInputs.js';
import type { ListGardenInputsDto } from './interfaces/ListGardenInputsDto.js';

export type ListGardenInputsDependencies = {
  gardenInputReadRepository: GardenInputReadRepository;
};

export class ListGardenInputs {
  private readonly gardenInputReadRepository: GardenInputReadRepository;

  constructor({ gardenInputReadRepository }: ListGardenInputsDependencies) {
    this.gardenInputReadRepository = gardenInputReadRepository;
  }

  async execute(
    user: UserSessionInfo | undefined,
    dto?: ListGardenInputsDto
  ): Promise<PaginatedResult<GardenInputSparseView>> {
    const query = dto?.query ?? {};
    const userFilters = query.filter ?? {};

    const filter: GardenInputFilter = canSeeDeletedGardenInputs(user)
      ? userFilters
      : { ...userFilters, status: { eq: 'active' } };

    return this.gardenInputReadRepository.findAll({ ...query, filter });
  }
}
