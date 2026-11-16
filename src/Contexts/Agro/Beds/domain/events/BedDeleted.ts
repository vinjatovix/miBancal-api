import { DomainEvent } from '../../../../shared/domain/events/index.js';

export interface BedDeletedPayload {
  readonly bedId: string;
  readonly ownerId: string;
  readonly deletedBy: string;
  readonly occurredAt: string;
}

export class BedDeleted extends DomainEvent<BedDeletedPayload> {
  public static readonly EVENT_NAME = 'bed.deleted';

  constructor(payload: BedDeletedPayload) {
    super({
      aggregateId: payload.bedId,
      eventName: BedDeleted.EVENT_NAME,
      payload
    });
  }
}
