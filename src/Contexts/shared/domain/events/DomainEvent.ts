import { v7 as uuidv7 } from 'uuid';

export interface DomainEventProps<Payload extends object> {
  readonly aggregateId: string;
  readonly eventName: string;
  readonly payload: Payload;
  readonly eventId?: string;
  readonly occurredAt?: Date;
}

export interface DomainEventPrimitives<Payload extends object> {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly payload: Payload;
}

export abstract class DomainEvent<Payload extends object = object> {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly eventName: string;
  public readonly payload: Payload;

  protected constructor(props: DomainEventProps<Payload>) {
    this.eventId = props.eventId ?? uuidv7();
    this.occurredAt = props.occurredAt ?? new Date();
    this.aggregateId = props.aggregateId;
    this.eventName = props.eventName;
    this.payload = props.payload;
  }

  /**
   * Self-contained serialization of the event. Pure domain primitive with no
   * persistence/transport coupling: `occurredAt` is an ISO 8601 string so a
   * forwarder can emit the object verbatim (e.g. a Kafka message value)
   * without recomposition.
   */
  public toPrimitives(): DomainEventPrimitives<Payload> {
    return {
      eventId: this.eventId,
      eventName: this.eventName,
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt.toISOString(),
      payload: this.payload
    };
  }
}
