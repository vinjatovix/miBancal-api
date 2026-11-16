import type { Brand } from '../../../shared/domain/valueObject/Brand.js';
import { createIdGenerator } from '../../../shared/domain/valueObject/BrandedId.js';

export type UserBookmarksId = Brand<string, 'UserBookmarksId'>;

const generator = createIdGenerator<UserBookmarksId>('UserBookmarksId');

export function createUserBookmarksId(value: string): UserBookmarksId {
  return generator.create(value);
}

export function randomUserBookmarksId(): UserBookmarksId {
  return generator.random();
}
