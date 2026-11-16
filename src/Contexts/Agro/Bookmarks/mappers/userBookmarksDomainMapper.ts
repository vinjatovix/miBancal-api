import type { UserBookmarksPrimitives } from '../domain/entities/types/UserBookmarksPrimitives.js';
import { UserBookmarks } from '../domain/entities/UserBookmarks.js';
import type { UserBookmarksDomainMapper } from './interfaces/UserBookmarksDomainMapper.js';

export const userBookmarksDomainMapper: UserBookmarksDomainMapper = {
  toPrimitives(aggregate: UserBookmarks): UserBookmarksPrimitives {
    return aggregate.toPrimitives();
  },

  fromPrimitives(primitives: UserBookmarksPrimitives): UserBookmarks {
    return UserBookmarks.fromPrimitives(primitives);
  }
};
