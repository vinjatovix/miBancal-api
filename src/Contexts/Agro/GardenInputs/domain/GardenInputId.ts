import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type GardenInputId = Brand<string, 'GardenInputId'>;

const generator = createIdGenerator<GardenInputId>('GardenInputId');

export function createGardenInputId(value: string): GardenInputId {
  return generator.create(value);
}

export function randomGardenInputId(): GardenInputId {
  return generator.random();
}
