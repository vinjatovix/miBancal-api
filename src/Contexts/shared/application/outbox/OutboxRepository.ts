import type { DomainEvent } from '../../domain/events/index.js';

export interface OutboxRepository {
  stage(events: DomainEvent[]): Promise<void>;
}
