import type { AppContainer } from '../../../../src/apps/agroApi/wiring/ContainerCradle.js';
import {
  EVENT_SUBSCRIPTIONS,
  registerEventSubscribers
} from '../../../../src/apps/agroApi/wiring/eventSubscriptions.js';
import { BedDeleted } from '../../../../src/Contexts/Agro/Beds/domain/events/index.js';
import type { EventHandler } from '../../../../src/Contexts/shared/application/eventBus/index.js';
import type { DomainEvent } from '../../../../src/Contexts/shared/domain/events/index.js';
import { InMemoryEventBusAdapter } from '../../../../src/Contexts/shared/infrastructure/eventBus/index.js';
import { random } from '../../../Contexts/shared/fixtures/random.js';

describe('registerEventSubscribers', () => {
  const buildContainer = (
    bus: InMemoryEventBusAdapter,
    calls: string[]
  ): AppContainer => {
    const record = (name: string): EventHandler => {
      return (): Promise<void> => {
        calls.push(name);
        return Promise.resolve();
      };
    };

    const handlers: Record<string, EventHandler> = {};
    for (const { handler } of EVENT_SUBSCRIPTIONS) {
      handlers[handler] = record(handler);
    }

    return {
      resolve: (name: string): unknown =>
        name === 'eventBus' ? bus : handlers[name]
    } as unknown as AppContainer;
  };

  const bedDeleted = (): BedDeleted =>
    new BedDeleted({
      bedId: random.uuid(),
      ownerId: random.uuid(),
      deletedBy: 'deleter',
      occurredAt: '2026-11-14T10:00:00.000Z'
    });

  it('routes every declared row to exactly its reactor and no other', async () => {
    expect(EVENT_SUBSCRIPTIONS.length).toBeGreaterThan(0);

    for (const { eventName, handler } of EVENT_SUBSCRIPTIONS) {
      const bus = new InMemoryEventBusAdapter();
      const calls: string[] = [];

      registerEventSubscribers(buildContainer(bus, calls));
      await bus.publish([{ eventName } as unknown as DomainEvent]);

      expect(calls).toEqual([handler]);
    }
  });

  it('runs a second reactor added to an existing fact, in registration order, with no producer change', async () => {
    const bus = new InMemoryEventBusAdapter();
    const calls: string[] = [];

    registerEventSubscribers(buildContainer(bus, calls));
    bus.subscribe('bed.deleted', (): Promise<void> => {
      calls.push('secondReactor');
      return Promise.resolve();
    });

    await bus.publish([bedDeleted()]);

    expect(calls).toEqual(['removeCropsOnBedDeleted', 'secondReactor']);
  });

  it('excludes plant.liked and plant.unliked from in-process subscriptions', () => {
    const eventNames = EVENT_SUBSCRIPTIONS.map((sub) => sub.eventName);

    expect(eventNames).not.toContain('plant.liked');
    expect(eventNames).not.toContain('plant.unliked');
    expect(eventNames).toEqual(['bed.deleted']);
  });
});
