import { BedDeleted } from '../../../../../src/Contexts/Agro/Beds/domain/events/index.js';
import type { EventBus } from '../../../../../src/Contexts/shared/application/eventBus/index.js';
import type { OutboxRepository } from '../../../../../src/Contexts/shared/application/outbox/index.js';
import type { DomainEvent } from '../../../../../src/Contexts/shared/domain/events/index.js';
import { OutboxEventBusAdapter } from '../../../../../src/Contexts/shared/infrastructure/eventBus/OutboxEventBusAdapter.js';
import { random } from '../../../shared/fixtures/random.js';

const anEvent = (): DomainEvent =>
  new BedDeleted({
    bedId: random.uuid(),
    ownerId: random.uuid(),
    deletedBy: 'gardener',
    occurredAt: new Date().toISOString()
  });

describe('OutboxEventBusAdapter', () => {
  let stage: jest.Mock<Promise<void>, [DomainEvent[]]>;
  let innerPublish: jest.Mock<Promise<void>, [DomainEvent[]]>;
  let innerSubscribe: jest.Mock;
  let outboxRepository: OutboxRepository;
  let inProcessEventBus: EventBus;
  let adapter: OutboxEventBusAdapter;

  beforeEach(() => {
    stage = jest.fn<Promise<void>, [DomainEvent[]]>().mockResolvedValue();
    innerPublish = jest
      .fn<Promise<void>, [DomainEvent[]]>()
      .mockResolvedValue();
    innerSubscribe = jest.fn();
    outboxRepository = { stage };
    inProcessEventBus = { publish: innerPublish, subscribe: innerSubscribe };
    adapter = new OutboxEventBusAdapter({
      outboxRepository,
      inProcessEventBus
    });
  });

  describe('publish', () => {
    it('is a clean no-op for an empty batch: neither stages nor dispatches', async () => {
      await adapter.publish([]);

      expect(stage).not.toHaveBeenCalled();
      expect(innerPublish).not.toHaveBeenCalled();
    });

    it('stages the events before dispatching them in-process', async () => {
      const events = [anEvent()];

      await adapter.publish(events);

      expect(stage).toHaveBeenCalledWith(events);
      expect(innerPublish).toHaveBeenCalledWith(events);
      expect(stage.mock.invocationCallOrder[0]).toBeLessThan(
        innerPublish.mock.invocationCallOrder[0] as number
      );
    });

    it('propagates a staging failure and never dispatches in-process', async () => {
      stage.mockRejectedValueOnce(new Error('stage failed'));

      await expect(adapter.publish([anEvent()])).rejects.toThrow(
        'stage failed'
      );
      expect(innerPublish).not.toHaveBeenCalled();
    });

    it('propagates an in-process dispatch failure after staging', async () => {
      innerPublish.mockRejectedValueOnce(new Error('handler failed'));

      await expect(adapter.publish([anEvent()])).rejects.toThrow(
        'handler failed'
      );
      expect(stage).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('delegates verbatim to the in-process bus', () => {
      const handler = jest.fn();

      adapter.subscribe('bed.deleted', handler);

      expect(innerSubscribe).toHaveBeenCalledWith('bed.deleted', handler);
    });
  });
});
