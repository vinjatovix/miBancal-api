import type { EventHandler } from '../../../Contexts/shared/application/eventBus/index.js';
import type { AppContainer, ContainerCradle } from './ContainerCradle.js';

export type EventHandlerComponentKey = {
  [Key in keyof ContainerCradle]: ContainerCradle[Key] extends EventHandler
    ? Key
    : never;
}[keyof ContainerCradle];

export type EventSubscription = {
  eventName: string;
  handler: EventHandlerComponentKey;
};

export const EVENT_SUBSCRIPTIONS: EventSubscription[] = [
  { eventName: 'bed.deleted', handler: 'removeCropsOnBedDeleted' }
];

export function registerEventSubscribers(container: AppContainer): void {
  const eventBus = container.resolve('eventBus');

  for (const { eventName, handler } of EVENT_SUBSCRIPTIONS) {
    eventBus.subscribe(eventName, container.resolve(handler));
  }
}
