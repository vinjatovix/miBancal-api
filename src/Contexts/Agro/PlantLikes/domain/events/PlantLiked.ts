import { DomainEvent } from '../../../../shared/domain/events/index.js';

export interface PlantLikedPayload {
  readonly plantId: string;
  readonly userId: string;
  readonly likedAt: string;
}

export class PlantLiked extends DomainEvent<PlantLikedPayload> {
  public static readonly EVENT_NAME = 'plant.liked';

  constructor(aggregateId: string, payload: PlantLikedPayload) {
    super({
      aggregateId,
      eventName: PlantLiked.EVENT_NAME,
      payload
    });
  }
}
