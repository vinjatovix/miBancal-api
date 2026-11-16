import { InMemoryEventBusAdapter } from '../../../../../src/Contexts/shared/infrastructure/eventBus/index.js';
import { TestDomainEventMother } from '../../domain/events/TestDomainEventMother.js';

describe('InMemoryEventBusAdapter', () => {
  it('invokes a subscribed handler when its event is published (C-01/C-03)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const event = TestDomainEventMother.create({ eventName: 'plant.watered' });
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('plant.watered', handler);

    await bus.publish([event]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('invokes handlers for one event name in registration order (C-04)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const event = TestDomainEventMother.create({ eventName: 'plant.watered' });
    const calls: string[] = [];
    const first = jest.fn().mockImplementation(() => {
      calls.push('first');
      return Promise.resolve();
    });
    const second = jest.fn().mockImplementation(() => {
      calls.push('second');
      return Promise.resolve();
    });
    bus.subscribe('plant.watered', first);
    bus.subscribe('plant.watered', second);

    await bus.publish([event]);

    expect(calls).toEqual(['first', 'second']);
  });

  it('dispatches a batch of events in the order provided (C-02)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const firstEvent = TestDomainEventMother.create({ eventName: 'a.one' });
    const secondEvent = TestDomainEventMother.create({ eventName: 'a.two' });
    const seen: string[] = [];
    bus.subscribe('a.one', (event) => {
      seen.push(event.eventName);
      return Promise.resolve();
    });
    bus.subscribe('a.two', (event) => {
      seen.push(event.eventName);
      return Promise.resolve();
    });

    await bus.publish([firstEvent, secondEvent]);

    expect(seen).toEqual(['a.one', 'a.two']);
  });

  it('resolves invoking nothing when publishing an empty batch (C-06)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('plant.watered', handler);

    await expect(bus.publish([])).resolves.toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it('resolves invoking nothing and raising nothing for an event with no subscribers (C-07)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const event = TestDomainEventMother.create({ eventName: 'nobody.listens' });

    await expect(bus.publish([event])).resolves.toBeUndefined();
  });

  it('resolves only after all invoked handlers have completed (C-05)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const event = TestDomainEventMother.create({ eventName: 'plant.watered' });
    let completed = false;
    bus.subscribe('plant.watered', async () => {
      await Promise.resolve();
      completed = true;
    });

    await bus.publish([event]);

    expect(completed).toBe(true);
  });

  it('rejects and stops later handlers for the event when a handler rejects (C-08, fail-fast)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const event = TestDomainEventMother.create({ eventName: 'plant.watered' });
    const failure = new Error('handler failed');
    const failing = jest.fn().mockRejectedValue(failure);
    const laterHandler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('plant.watered', failing);
    bus.subscribe('plant.watered', laterHandler);

    await expect(bus.publish([event])).rejects.toBe(failure);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(laterHandler).not.toHaveBeenCalled();
  });

  it('does not run events published after the one whose handler rejected (C-08, fail-fast)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const firstEvent = TestDomainEventMother.create({ eventName: 'a.one' });
    const secondEvent = TestDomainEventMother.create({ eventName: 'a.two' });
    const failure = new Error('handler failed');
    const failing = jest.fn().mockRejectedValue(failure);
    const secondHandler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('a.one', failing);
    bus.subscribe('a.two', secondHandler);

    await expect(bus.publish([firstEvent, secondEvent])).rejects.toBe(failure);
    expect(secondHandler).not.toHaveBeenCalled();
  });

  it('does not de-duplicate repeated identical subscriptions (C-09)', async () => {
    const bus = new InMemoryEventBusAdapter();
    const event = TestDomainEventMother.create({ eventName: 'plant.watered' });
    const handler = jest.fn().mockResolvedValue(undefined);
    bus.subscribe('plant.watered', handler);
    bus.subscribe('plant.watered', handler);

    await bus.publish([event]);

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
