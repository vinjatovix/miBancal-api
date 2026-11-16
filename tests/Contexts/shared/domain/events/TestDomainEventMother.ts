import { DomainEvent } from '../../../../../src/Contexts/shared/domain/events/index.js';
import type { DomainEventProps } from '../../../../../src/Contexts/shared/domain/events/index.js';
import { random } from '../../fixtures/index.js';

export interface TestPayload {
  readonly value: string;
}

export class TestDomainEvent extends DomainEvent<TestPayload> {
  public constructor(props: DomainEventProps<TestPayload>) {
    super(props);
  }
}

export class TestDomainEventMother {
  static create(
    overrides: Partial<DomainEventProps<TestPayload>> = {}
  ): TestDomainEvent {
    const props: DomainEventProps<TestPayload> = {
      aggregateId: overrides.aggregateId ?? random.uuid(),
      eventName: overrides.eventName ?? 'test.domain-event',
      payload: overrides.payload ?? { value: random.word() },
      ...(overrides.eventId !== undefined && { eventId: overrides.eventId }),
      ...(overrides.occurredAt !== undefined && {
        occurredAt: overrides.occurredAt
      })
    };

    return new TestDomainEvent(props);
  }
}
