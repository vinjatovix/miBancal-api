import type { DomainEvent } from '../events/index.js';

export abstract class AggregateRoot<TId extends string> {
  readonly #domainEvents: DomainEvent[] = [];

  constructor(public readonly id: TId) {}

  public record(event: DomainEvent): void {
    this.#domainEvents.push(event);
  }

  public pullDomainEvents(): DomainEvent[] {
    const recorded = [...this.#domainEvents];
    this.#domainEvents.length = 0;

    return recorded;
  }
}
