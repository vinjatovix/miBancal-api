/* eslint-disable @typescript-eslint/require-await */
import type { Anomaly } from '../../../../../src/Contexts/Agro/Anomalies/domain/entities/Anomaly.js';
import type { AnomalyPrimitives } from '../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyPrimitives.js';
import { AnomalyStatus } from '../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import type { AnomalyRepository } from '../../../../../src/Contexts/Agro/Anomalies/domain/repositories/interfaces/AnomalyRepository.js';
import { anomalyDomainMapper } from '../../../../../src/Contexts/Agro/Anomalies/mappers/anomalyDomainMapper.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class AnomalyRepositoryMock
  extends BaseMongoCrudRepositoryMock<Anomaly, AnomalyPrimitives>
  implements AnomalyRepository
{
  protected readonly findBySlugMock = jest.fn();
  protected readonly findActiveBySlugMock = jest.fn();

  async findBySlug(slug: string): Promise<Nullable<Anomaly>> {
    this.findBySlugMock(slug);

    const anomaly = Array.from(this.storage.values()).find(
      (a) => a.slug === slug
    );

    return anomaly ? this.toDomain(this.toPrimitives(anomaly)) : null;
  }

  async findActiveBySlug(slug: string): Promise<Nullable<Anomaly>> {
    this.findActiveBySlugMock(slug);

    const anomaly = Array.from(this.storage.values()).find(
      (a) => a.slug === slug
    );

    return anomaly && this.isActive(anomaly)
      ? this.toDomain(this.toPrimitives(anomaly))
      : null;
  }

  protected toDomain(primitives: AnomalyPrimitives): Anomaly {
    return anomalyDomainMapper.fromPrimitives(primitives);
  }

  protected toPrimitives(entity: Anomaly): AnomalyPrimitives {
    return anomalyDomainMapper.toPrimitives(entity);
  }

  protected isActive(entity: Anomaly): boolean {
    return entity.status !== AnomalyStatus.DELETED;
  }

  protected entityName(): string {
    return 'Anomaly';
  }

  assertFindBySlugHasBeenCalledWith(slug: string): void {
    expect(this.findBySlugMock).toHaveBeenCalledWith(slug);
  }
}
