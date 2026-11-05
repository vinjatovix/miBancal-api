/* eslint-disable @typescript-eslint/require-await */
import type { GardenInput } from '../../../../../src/Contexts/Agro/GardenInputs/domain/entities/GardenInput.js';
import type { GardenInputPrimitives } from '../../../../../src/Contexts/Agro/GardenInputs/domain/entities/types/GardenInputPrimitives.js';
import type { GardenInputRepository } from '../../../../../src/Contexts/Agro/GardenInputs/domain/repositories/interfaces/GardenInputRepository.js';
import { gardenInputDomainMapper } from '../../../../../src/Contexts/Agro/GardenInputs/mappers/gardenInputDomainMapper.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class GardenInputRepositoryMock
  extends BaseMongoCrudRepositoryMock<GardenInput, GardenInputPrimitives>
  implements GardenInputRepository
{
  protected readonly findBySlugMock = jest.fn();
  protected readonly findActiveBySlugMock = jest.fn();

  async findBySlug(slug: string): Promise<Nullable<GardenInput>> {
    this.findBySlugMock(slug);

    const input = Array.from(this.storage.values()).find(
      (a) => a.slug === slug
    );

    return input ? this.toDomain(this.toPrimitives(input)) : null;
  }

  async findActiveBySlug(slug: string): Promise<Nullable<GardenInput>> {
    this.findActiveBySlugMock(slug);

    const input = Array.from(this.storage.values()).find(
      (a) => a.slug === slug
    );

    return input && this.isActive(input)
      ? this.toDomain(this.toPrimitives(input))
      : null;
  }

  protected toDomain(primitives: GardenInputPrimitives): GardenInput {
    return gardenInputDomainMapper.fromPrimitives(primitives);
  }

  protected toPrimitives(entity: GardenInput): GardenInputPrimitives {
    return gardenInputDomainMapper.toPrimitives(entity);
  }

  protected isActive(entity: GardenInput): boolean {
    return entity.status !== 'deleted';
  }

  protected entityName(): string {
    return 'GardenInput';
  }

  assertFindBySlugHasBeenCalledWith(slug: string): void {
    expect(this.findBySlugMock).toHaveBeenCalledWith(slug);
  }
}
