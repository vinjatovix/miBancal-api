import type { Collection, Document } from 'mongodb';

import { MongoOutboxProgressRepository } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoOutboxProgressRepository.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

let context: DbTestContext;
let repository: MongoOutboxProgressRepository;

const progressCollection = (): Collection<Document & { _id: string }> =>
  context.db.collection<Document & { _id: string }>('outbox_progress');

beforeAll(async () => {
  context = await createDbTestContext();
  repository = new MongoOutboxProgressRepository({ db: context.db });
});

beforeEach(async () => {
  await context.reset();
});

afterAll(async () => {
  await context.close();
});

describe('MongoOutboxProgressRepository', () => {
  it('returns an empty progress before anything is saved', async () => {
    const progress = await repository.load();

    expect(progress).toEqual({});
  });

  it('round-trips the resume token and the high-water mark', async () => {
    const resumeToken = { _data: 'resume-token-1' };
    const lastForwardedId = '019316b0-0000-7000-8000-000000000001';

    await repository.save({ resumeToken, lastForwardedId });
    const progress = await repository.load();

    expect(progress.resumeToken).toEqual(resumeToken);
    expect(progress.lastForwardedId).toBe(lastForwardedId);
  });

  it('keeps a single document when saved repeatedly', async () => {
    await repository.save({
      resumeToken: { _data: 'first' },
      lastForwardedId: 'id-1'
    });
    await repository.save({
      resumeToken: { _data: 'second' },
      lastForwardedId: 'id-2'
    });

    const count = await progressCollection().countDocuments();
    const progress = await repository.load();

    expect(count).toBe(1);
    expect(progress.resumeToken).toEqual({ _data: 'second' });
    expect(progress.lastForwardedId).toBe('id-2');
  });

  it('omits absent fields instead of persisting null', async () => {
    await repository.save({ lastForwardedId: 'id-only' });

    const stored = await progressCollection().findOne({ _id: 'singleton' });

    expect(stored).not.toBeNull();
    expect(stored).not.toHaveProperty('resumeToken');
    expect(stored?.lastForwardedId).toBe('id-only');
  });

  it('clears a previously stored field on a later save that omits it', async () => {
    await repository.save({
      resumeToken: { _data: 'present' },
      lastForwardedId: 'id-1'
    });
    await repository.save({ lastForwardedId: 'id-2' });

    const stored = await progressCollection().findOne({ _id: 'singleton' });

    expect(stored).not.toHaveProperty('resumeToken');
    expect(stored?.lastForwardedId).toBe('id-2');
  });
});
