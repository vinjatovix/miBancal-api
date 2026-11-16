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
