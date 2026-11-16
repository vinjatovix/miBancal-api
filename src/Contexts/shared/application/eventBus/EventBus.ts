import type { DomainEvent } from '../../domain/events/index.js';

export type EventHandler = (event: DomainEvent) => Promise<void>;

export interface EventBus {
  publish(events: DomainEvent[]): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}
