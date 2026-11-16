import type {
  EventBus,
  EventHandler
} from '../../application/eventBus/index.js';
import type { DomainEvent } from '../../domain/events/index.js';

export class InMemoryEventBusAdapter implements EventBus {
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  public subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName);
    if (existing) {
      existing.push(handler);
      return;
    }
    this.handlers.set(eventName, [handler]);
  }

  public async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventName);
      if (!handlers) {
        continue;
      }
      for (const handler of handlers) {
        await handler(event);
      }
    }
  }
}
