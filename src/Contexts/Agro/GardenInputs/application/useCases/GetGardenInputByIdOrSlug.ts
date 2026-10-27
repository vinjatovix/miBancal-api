import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type {
  GardenInputField,
  GardenInputReadRepository,
  GardenInputSparseView
} from '../queries/index.js';
import { canSeeDeletedGardenInputs } from './canSeeDeletedGardenInputs.js';

export type GetGardenInputByIdOrSlugDependencies = {
  gardenInputReadRepository: GardenInputReadRepository;
};

export class GetGardenInputByIdOrSlug {
  private readonly gardenInputReadRepository: GardenInputReadRepository;

  constructor({
    gardenInputReadRepository
  }: GetGardenInputByIdOrSlugDependencies) {
    this.gardenInputReadRepository = gardenInputReadRepository;
  }

  async execute(
    idOrSlug: string,
    user: UserSessionInfo | undefined,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<GardenInputSparseView> {
    const canSeeDeleted = canSeeDeletedGardenInputs(user);
    const byId = UuidValidator.isValid(idOrSlug);

    const found = byId
      ? canSeeDeleted
        ? await this.gardenInputReadRepository.findById(idOrSlug, options)
        : await this.gardenInputReadRepository.findActiveById(idOrSlug, options)
      : canSeeDeleted
        ? await this.gardenInputReadRepository.findBySlug(idOrSlug, options)
        : await this.gardenInputReadRepository.findActiveBySlug(
            idOrSlug,
            options
          );

    return ensureFound(
      found,
      'GardenInput',
      idOrSlug,
      byId ? undefined : 'slug'
    );
  }
}
