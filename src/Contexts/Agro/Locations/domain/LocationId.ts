import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type LocationId = Brand<string, 'LocationId'>;

const generator = createIdGenerator<LocationId>('LocationId');

export function createLocationId(value: string): LocationId {
  return generator.create(value);
}

export function randomLocationId(): LocationId {
  return generator.random();
}
