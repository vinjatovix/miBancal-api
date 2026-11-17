import {
  ConsumerDispatcher,
  type DomainEventConsumer
} from '../../../Contexts/shared/application/consumers/index.js';
import type {
  ConsumerContainer,
  ConsumerContainerCradle
} from './ConsumerContainerCradle.js';

export type DomainEventConsumerComponentKey = {
  [
    Key in keyof ConsumerContainerCradle
  ]: ConsumerContainerCradle[Key] extends DomainEventConsumer ? Key : never;
}[keyof ConsumerContainerCradle];

export const CONSUMER_REGISTRATIONS: readonly DomainEventConsumerComponentKey[] =
  ['plantLikesCounterConsumer'];

export function buildConsumerDispatcher(
  container: ConsumerContainer
): ConsumerDispatcher {
  const consumers: DomainEventConsumer[] = CONSUMER_REGISTRATIONS.map((key) =>
    container.resolve(key)
  );

  return new ConsumerDispatcher({
    consumers,
    logger: container.resolve('logger')
  });
}
