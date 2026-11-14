import type {
  EventBus,
  EventHandler
} from '../../application/eventBus/index.js';
import type { OutboxRepository } from '../../application/outbox/index.js';
import type { DomainEvent } from '../../domain/events/index.js';

export type OutboxEventBusAdapterDependencies = {
  outboxRepository: OutboxRepository;
  inProcessEventBus: EventBus;
};

/**
 * Durable implementation of the {@link EventBus} port. Decorates the in-process
 * bus: on `publish` it first stages every event into the `outbox` collection
 * (joining the active unit-of-work session) and then dispatches to in-process
 * handlers. Both share the transaction, so a failure in either aborts
 * everything and leaves zero outbox records.
 */
export class OutboxEventBusAdapter implements EventBus {
  private readonly outboxRepository: OutboxRepository;
  private readonly inProcessEventBus: EventBus;

  constructor({
    outboxRepository,
    inProcessEventBus
  }: OutboxEventBusAdapterDependencies) {
    this.outboxRepository = outboxRepository;
    this.inProcessEventBus = inProcessEventBus;
  }

  public async publish(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    await this.outboxRepository.stage(events);
    await this.inProcessEventBus.publish(events);
  }

  public subscribe(eventName: string, handler: EventHandler): void {
    this.inProcessEventBus.subscribe(eventName, handler);
  }
}
