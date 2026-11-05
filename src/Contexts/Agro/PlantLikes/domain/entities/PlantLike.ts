import type { UserId } from '../../../../Auth/domain/UserId.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import type { PlantId } from '../../../Plants/domain/PlantId.js';
import type { PlantLikeId } from '../PlantLikeId.js';
import type { PlantLikePrimitives } from './types/PlantLikePrimitives.js';

type PlantLikeProps = {
  id: PlantLikeId;
  userId: UserId;
  plantId: PlantId;
  likedAt: Date;
};

/**
 * One like by a user on a catalog plant. `userId` and `plantId` are immutable:
 * a like is created once and later removed, never re-pointed.
 */
export class PlantLike extends AggregateRoot<PlantLikeId> {
  private readonly props: Readonly<PlantLikeProps>;

  constructor(props: PlantLikeProps) {
    super(props.id);
    this.props = Object.freeze({ ...props });
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get plantId(): PlantId {
    return this.props.plantId;
  }

  get likedAt(): Date {
    return this.props.likedAt;
  }

  static create(
    id: PlantLikeId,
    userId: UserId,
    plantId: PlantId,
    at: Date = new Date()
  ): PlantLike {
    return new PlantLike({ id, userId, plantId, likedAt: at });
  }

  toPrimitives(): PlantLikePrimitives {
    return {
      id: this.props.id,
      userId: this.props.userId,
      plantId: this.props.plantId,
      likedAt: this.props.likedAt.toISOString()
    };
  }
}
