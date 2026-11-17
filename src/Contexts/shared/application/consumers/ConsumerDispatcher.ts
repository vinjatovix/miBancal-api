import type { KafkaDomainEventEnvelope } from '../../domain/events/index.js';
import type { AppLogger } from '../../plugins/index.js';
import {
  ConsumerDispatchFailure,
  type ConsumerFailure
} from './ConsumerDispatchFailure.js';
import type { DomainEventConsumer } from './DomainEventConsumer.js';

export type ConsumerDispatcherDependencies = {
  consumers: readonly DomainEventConsumer[];
  logger: AppLogger;
};

export class ConsumerDispatcher {
  private readonly consumers: readonly DomainEventConsumer[];
  private readonly logger: AppLogger;

  constructor({ consumers, logger }: ConsumerDispatcherDependencies) {
    this.consumers = consumers;
    this.logger = logger;
  }

  public async dispatch(envelope: KafkaDomainEventEnvelope): Promise<void> {
    const matching = this.consumers.filter((consumer) =>
      consumer.eventNames.has(envelope.eventName)
    );

    if (matching.length === 0) {
      return;
    }

    const failures: ConsumerFailure[] = [];
    for (const consumer of matching) {
      try {
        await consumer.handle(envelope);
      } catch (error: unknown) {
        this.logger.error('Domain event consumer failed', error, {
          consumer: consumer.name,
          eventId: envelope.eventId,
          eventName: envelope.eventName
        });
        failures.push({ consumer: consumer.name, error });
      }
    }

    if (failures.length > 0) {
      throw new ConsumerDispatchFailure(failures);
    }
  }
}
