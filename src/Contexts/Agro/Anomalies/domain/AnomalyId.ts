import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type AnomalyId = Brand<string, 'AnomalyId'>;

const generator = createIdGenerator<AnomalyId>('AnomalyId');

export function createAnomalyId(value: string): AnomalyId {
  return generator.create(value);
}

export function randomAnomalyId(): AnomalyId {
  return generator.random();
}
