import type {
  EventForwarder,
  OutboxRecord
} from '../../application/outbox/index.js';
import type { AppLogger } from '../../plugins/logger.plugin.js';

export type LoggingEventForwarderDependencies = {
  logger: AppLogger;
};

export class LoggingEventForwarder implements EventForwarder {
  private readonly logger: AppLogger;

  constructor({ logger }: LoggingEventForwarderDependencies) {
    this.logger = logger;
  }

  public forward(record: OutboxRecord): Promise<void> {
    this.logger.info(
      `Forwarded outbox event ${record.eventId} ` +
        `(${record.eventName}) for aggregate ${record.aggregateId} ` +
        `occurred at ${record.occurredAt.toISOString()}`
    );

    return Promise.resolve();
  }
}
