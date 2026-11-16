import type { UserBookmarksPrimitives } from '../../domain/entities/types/UserBookmarksPrimitives.js';
import type { UserBookmarks } from '../../domain/entities/UserBookmarks.js';

export interface UserBookmarksDomainMapper {
  toPrimitives(aggregate: UserBookmarks): UserBookmarksPrimitives;
  fromPrimitives(primitives: UserBookmarksPrimitives): UserBookmarks;
}
