import { TestDomainEventMother } from '../events/TestDomainEventMother.js';
import { TestAggregateMother } from './TestAggregateMother.js';

describe('AggregateRoot', () => {
  describe('pullDomainEvents with nothing recorded', () => {
    it('should return an empty array and never throw', () => {
      const aggregate = TestAggregateMother.create();

      expect(aggregate.pullDomainEvents()).toEqual([]);
    });
  });

  describe('record then pull', () => {
    it('should return the recorded events in insertion order, including repeated eventName', () => {
      const aggregate = TestAggregateMother.create();
      const first = TestDomainEventMother.create({ eventName: 'bed.watered' });
      const second = TestDomainEventMother.create({
        eventName: 'bed.fertilized'
      });
      const third = TestDomainEventMother.create({ eventName: 'bed.watered' });

      aggregate.record(first);
      aggregate.record(second);
      aggregate.record(third);

      expect(aggregate.pullDomainEvents()).toEqual([first, second, third]);
    });

    it('should drain the buffer so an immediate second pull returns an empty array', () => {
      const aggregate = TestAggregateMother.create();
      aggregate.record(TestDomainEventMother.create());
      aggregate.record(TestDomainEventMother.create());

      aggregate.pullDomainEvents();

      expect(aggregate.pullDomainEvents()).toEqual([]);
    });

    it('should return a copy so mutating the result does not affect later pulls', () => {
      const aggregate = TestAggregateMother.create();
      const event = TestDomainEventMother.create();
      aggregate.record(event);

      const pulled = aggregate.pullDomainEvents();
      pulled.push(TestDomainEventMother.create());
      aggregate.record(event);

      expect(aggregate.pullDomainEvents()).toEqual([event]);
    });
  });

  describe('per-instance buffering', () => {
    it('should not leak recorded events from one aggregate to another', () => {
      const one = TestAggregateMother.create();
      const another = TestAggregateMother.create();

      one.record(TestDomainEventMother.create());

      expect(another.pullDomainEvents()).toEqual([]);
    });
  });
});
