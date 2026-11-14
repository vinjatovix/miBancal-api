export interface OutboxRecord {
  eventId: string;
  eventName: string;
  aggregateId: string;
  occurredAt: Date;
  payload: object;
  createdAt: Date;
}
