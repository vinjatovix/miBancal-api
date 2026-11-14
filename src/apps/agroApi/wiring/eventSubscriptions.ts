import type { EventHandler } from '../../../Contexts/shared/application/eventBus/index.js';
import type { AppContainer, ContainerCradle } from './ContainerCradle.js';

/**
 * Cradle keys whose resolved value already satisfies {@link EventHandler}.
 * A subscription may only point at such a key, so the registry stays fully
 * type-safe with no cast: the handler is adapted to the functional
 * `EventHandler` shape at its container registration, not here. The set is
 * empty this iteration (no consumer yet) and gains its first entry in
 * Iteration 45d.
 */
export type EventHandlerComponentKey = {
  [Key in keyof ContainerCradle]: ContainerCradle[Key] extends EventHandler
    ? Key
    : never;
}[keyof ContainerCradle];

export type EventSubscription = {
  eventName: string;
  handler: EventHandlerComponentKey;
};

export const EVENT_SUBSCRIPTIONS: EventSubscription[] = [];

export function registerEventSubscribers(container: AppContainer): void {
  const eventBus = container.resolve('eventBus');

  for (const { eventName, handler } of EVENT_SUBSCRIPTIONS) {
    eventBus.subscribe(eventName, container.resolve(handler));
  }
}
