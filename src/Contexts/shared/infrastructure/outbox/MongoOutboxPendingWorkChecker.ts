import type { Collection, Document } from 'mongodb';

import type { OutboxPendingWorkChecker } from '../../application/outbox/OutboxPendingWorkChecker.js';

const PENDING_INDEX_HINT = 'outbox_processedAt_id';

export type MongoOutboxPendingWorkCheckerDependencies = {
  outboxCollection: Collection<Document>;
};

export class MongoOutboxPendingWorkChecker implements OutboxPendingWorkChecker {
  private readonly outboxCollection: Collection<Document>;

  constructor({ outboxCollection }: MongoOutboxPendingWorkCheckerDependencies) {
    this.outboxCollection = outboxCollection;
  }

  async hasPendingWork(lastForwardedId?: string): Promise<boolean> {
    const filter: Document = { processedAt: null };
    if (lastForwardedId !== undefined) {
      filter._id = { $gt: lastForwardedId };
    }

    const document = await this.outboxCollection.findOne(filter, {
      projection: { _id: 1 },
      hint: PENDING_INDEX_HINT
    });

    return document !== null;
  }
}
