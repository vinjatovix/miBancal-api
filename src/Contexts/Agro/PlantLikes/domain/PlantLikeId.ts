import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type PlantLikeId = Brand<string, 'PlantLikeId'>;

const generator = createIdGenerator<PlantLikeId>('PlantLikeId');

export function createPlantLikeId(value: string): PlantLikeId {
  return generator.create(value);
}

export function randomPlantLikeId(): PlantLikeId {
  return generator.random();
}
