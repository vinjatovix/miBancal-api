import type { Db } from 'mongodb';

import { MongoOutboxDispatchRepository } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoOutboxDispatchRepository.js';

describe('MongoOutboxDispatchRepository', () => {
  it('sets processedAt on the matching outbox record and never writes null', async () => {
    const updateOne = jest
      .fn<
        Promise<{ matchedCount: number }>,
        [unknown, { $set: { processedAt: unknown } }]
      >()
      .mockResolvedValue({ matchedCount: 1 });
    const collection = jest.fn().mockReturnValue({ updateOne });
    const db = { collection } as unknown as Db;
    const repository = new MongoOutboxDispatchRepository({ db });
    const dispatchedAt = new Date('2026-11-15T12:00:00.000Z');

    await repository.markDispatched('event-1', dispatchedAt);

    expect(collection).toHaveBeenCalledWith('outbox');
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'event-1' },
      { $set: { processedAt: dispatchedAt } }
    );
    const update = updateOne.mock.calls[0]?.[1];
    expect(update?.$set.processedAt).toBeInstanceOf(Date);
    expect(update?.$set.processedAt).not.toBeNull();
  });
});
