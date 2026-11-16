import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type PlantRelationId = Brand<string, 'PlantRelationId'>;

const generator = createIdGenerator<PlantRelationId>('PlantRelationId');

export function createPlantRelationId(value: string): PlantRelationId {
  return generator.create(value);
}

export function randomPlantRelationId(): PlantRelationId {
  return generator.random();
}
