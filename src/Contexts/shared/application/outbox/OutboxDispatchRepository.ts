export interface OutboxDispatchRepository {
  markDispatched(eventId: string, dispatchedAt: Date): Promise<void>;
}
