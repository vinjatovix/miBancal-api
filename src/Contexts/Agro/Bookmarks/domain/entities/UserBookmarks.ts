import { createUserId, type UserId } from '../../../../Auth/domain/UserId.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { Serializable } from '../../../../shared/domain/interfaces/Serializable.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import type { PlantId } from '../../../Plants/domain/PlantId.js';
import {
  createUserBookmarksId,
  type UserBookmarksId
} from '../UserBookmarksId.js';
import { FavoritePlantItem } from '../value-objects/FavoritePlantItem.js';
import type { UserBookmarksPrimitives } from './types/UserBookmarksPrimitives.js';
import type { UserBookmarksProps } from './types/UserBookmarksProps.js';

type UserBookmarksState = {
  readonly id: UserBookmarksId;
  readonly userId: UserId;
  readonly plants: ReadonlyArray<FavoritePlantItem>;
  readonly metadata: Metadata;
  readonly version: number;
};

export class UserBookmarks
  extends AggregateRoot<UserBookmarksId>
  implements Serializable<UserBookmarksPrimitives>
{
  private props: UserBookmarksState;

  constructor(props: UserBookmarksProps) {
    super(props.id);
    this.assertInvariants(props);

    this.props = Object.freeze({
      id: props.id,
      userId: props.userId,
      plants: Object.freeze([...props.plants]),
      metadata: props.metadata,
      version: props.version ?? 0
    });
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get plants(): ReadonlyArray<FavoritePlantItem> {
    return this.props.plants;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get version(): number {
    return this.props.version;
  }

  plantBookmarks(): ReadonlyArray<FavoritePlantItem> {
    return this.props.plants;
  }

  hasPlant(plantId: PlantId): boolean {
    return this.props.plants.some((item) => item.plantId === plantId);
  }

  getPlantBookmark(plantId: PlantId): FavoritePlantItem | null {
    return this.props.plants.find((item) => item.plantId === plantId) ?? null;
  }

  addPlant(plantId: PlantId, user: string, at: Date = new Date()): boolean {
    if (this.hasPlant(plantId)) {
      return false;
    }

    const newItem = new FavoritePlantItem(plantId, at);
    const updatedPlants = Object.freeze([...this.props.plants, newItem]);
    const updatedMetadata = Metadata.update(this.props.metadata, user, at);

    this.props = Object.freeze({
      ...this.props,
      plants: updatedPlants,
      metadata: updatedMetadata
    });

    return true;
  }

  removePlant(plantId: PlantId, user: string, at: Date = new Date()): boolean {
    if (!this.hasPlant(plantId)) {
      return false;
    }

    const updatedPlants = Object.freeze(
      this.props.plants.filter((item) => item.plantId !== plantId)
    );
    const updatedMetadata = Metadata.update(this.props.metadata, user, at);

    this.props = Object.freeze({
      ...this.props,
      plants: updatedPlants,
      metadata: updatedMetadata
    });

    return true;
  }

  toPrimitives(): UserBookmarksPrimitives {
    return {
      id: this.props.id,
      userId: this.props.userId,
      plants: this.props.plants.map((item) => item.toPrimitives()),
      metadata: this.props.metadata.toPrimitives(),
      version: this.props.version
    };
  }

  static create(
    id: UserBookmarksId,
    userId: UserId,
    user: string,
    at: Date = new Date()
  ): UserBookmarks {
    return new UserBookmarks({
      id,
      userId,
      plants: [],
      metadata: Metadata.create(user, at),
      version: 0
    });
  }

  static fromPrimitives(p: UserBookmarksPrimitives): UserBookmarks {
    return new UserBookmarks({
      id: createUserBookmarksId(p.id),
      userId: createUserId(p.userId),
      plants: p.plants.map((item) => FavoritePlantItem.fromPrimitives(item)),
      metadata: Metadata.fromPrimitives(p.metadata),
      version: p.version
    });
  }

  private assertInvariants(props: UserBookmarksProps): void {
    if (!props.id) {
      throw new InvalidArgumentException('UserBookmarks id is required');
    }
    if (!props.userId) {
      throw new InvalidArgumentException('UserBookmarks userId is required');
    }

    const seenPlantIds = new Set<string>();
    for (const item of props.plants) {
      if (seenPlantIds.has(item.plantId)) {
        throw new InvalidArgumentException(
          `Duplicate plantId '${item.plantId}' in UserBookmarks plants collection`
        );
      }
      seenPlantIds.add(item.plantId);
    }
  }
}
