import type { UserId } from '../../../../Auth/domain/UserId.js';
import type { PlantId } from '../../../Plants/domain/PlantId.js';
import type { PlantLikeId } from '../PlantLikeId.js';
import type { PlantLikePrimitives } from './types/PlantLikePrimitives.js';

type PlantLikeProps = {
  id: PlantLikeId;
  userId: UserId;
  plantId: PlantId;
  likedAt: Date;
};

export class PlantLike {
  private readonly props: Readonly<PlantLikeProps>;

  constructor(props: PlantLikeProps) {
    this.props = Object.freeze({ ...props });
  }

  get id(): PlantLikeId {
    return this.props.id;
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
