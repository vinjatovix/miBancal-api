import type { KafkaDomainEventEnvelope } from '../../domain/events/index.js';

export interface DomainEventConsumer {
  readonly name: string;
  readonly eventNames: ReadonlySet<string>;
  handle(envelope: KafkaDomainEventEnvelope): Promise<void>;
}
