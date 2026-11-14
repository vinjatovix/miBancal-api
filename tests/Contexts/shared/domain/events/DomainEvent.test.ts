import { random } from '../../fixtures/index.js';
import { TestDomainEventMother } from './TestDomainEventMother.js';
import type { TestPayload } from './TestDomainEventMother.js';

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('DomainEvent', () => {
  describe('when only aggregateId, eventName and payload are supplied', () => {
    it('should expose all five attributes', () => {
      const aggregateId = random.uuid();
      const payload: TestPayload = { value: 'planted' };

      const event = TestDomainEventMother.create({
        aggregateId,
        eventName: 'plant.recorded',
        payload
      });

      expect(event.aggregateId).toBe(aggregateId);
      expect(event.eventName).toBe('plant.recorded');
      expect(event.payload).toEqual(payload);
      expect(typeof event.eventId).toBe('string');
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should default eventId to a fresh UUIDv7', () => {
      const event = TestDomainEventMother.create();

      expect(event.eventId).toMatch(UUID_V7_REGEX);
    });

    it('should default occurredAt to a current Date', () => {
      const before = Date.now();

      const event = TestDomainEventMother.create();

      const after = Date.now();
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('chronological sortability of defaulted eventId', () => {
    it('should order two events created in sequence lexicographically by eventId', () => {
      const first = TestDomainEventMother.create();
      const second = TestDomainEventMother.create();

      expect(first.eventId < second.eventId).toBe(true);
    });
  });

  describe('reconstitution with explicit identity and moment', () => {
    it('should preserve the supplied eventId and occurredAt unchanged', () => {
      const eventId = random.uuid();
      const occurredAt = new Date('2026-01-10T12:30:00.000Z');

      const event = TestDomainEventMother.create({ eventId, occurredAt });

      expect(event.eventId).toBe(eventId);
      expect(event.occurredAt).toBe(occurredAt);
    });
  });
});
