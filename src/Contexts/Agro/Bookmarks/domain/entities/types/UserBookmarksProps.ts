import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { UserBookmarksId } from '../../UserBookmarksId.js';
import type { FavoritePlantItem } from '../../value-objects/FavoritePlantItem.js';

export type UserBookmarksProps = {
  id: UserBookmarksId;
  userId: UserId;
  plants: ReadonlyArray<FavoritePlantItem>;
  metadata: Metadata;
  version?: number | undefined;
};
