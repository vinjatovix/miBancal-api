import { DomainEvent } from '../../../../shared/domain/events/index.js';

export interface PlantUnlikedPayload {
  readonly plantId: string;
  readonly userId: string;
}

export class PlantUnliked extends DomainEvent<PlantUnlikedPayload> {
  public static readonly EVENT_NAME = 'plant.unliked';

  constructor(aggregateId: string, payload: PlantUnlikedPayload) {
    super({
      aggregateId,
      eventName: PlantUnliked.EVENT_NAME,
      payload
    });
  }
}
