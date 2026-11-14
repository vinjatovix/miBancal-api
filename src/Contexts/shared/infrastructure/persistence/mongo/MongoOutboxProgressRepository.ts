import type { Db, Document, ResumeToken } from 'mongodb';

import type {
  OutboxProgress,
  OutboxProgressRepository
} from '../../../application/outbox/index.js';
import { MongoRepository } from './MongoRepository.js';

const SINGLETON_ID = 'singleton';

type OutboxProgressDocument = Document & {
  _id: string;
  resumeToken?: ResumeToken;
  lastForwardedId?: string;
  updatedAt: Date;
};

export type MongoOutboxProgressRepositoryDependencies = {
  db: Db;
};

export class MongoOutboxProgressRepository
  extends MongoRepository
  implements OutboxProgressRepository
{
  constructor({ db }: MongoOutboxProgressRepositoryDependencies) {
    super(db);
  }

  protected entityName(): string {
    return 'OutboxProgress';
  }

  protected collectionName(): string {
    return 'outbox_progress';
  }

  public async load(): Promise<OutboxProgress> {
    const document = await this.handleMongoError(() =>
      this.collection().findOne({ _id: SINGLETON_ID })
    );

    if (document === null) {
      return {};
    }

    return this.toProgress(document as OutboxProgressDocument);
  }

  public async save(progress: OutboxProgress): Promise<void> {
    const { set, unset } = this.buildUpdate(progress);
    const update: Document = { $set: set };

    if (Object.keys(unset).length > 0) {
      update.$unset = unset;
    }

    await this.handleMongoError(() =>
      this.collection().updateOne({ _id: SINGLETON_ID }, update, {
        upsert: true
      })
    );
  }

  private toProgress(document: OutboxProgressDocument): OutboxProgress {
    const progress: OutboxProgress = {};

    if (document.resumeToken !== undefined) {
      progress.resumeToken = document.resumeToken;
    }
    if (document.lastForwardedId !== undefined) {
      progress.lastForwardedId = document.lastForwardedId;
    }

    return progress;
  }

  private buildUpdate(progress: OutboxProgress): {
    set: Document;
    unset: Record<string, ''>;
  } {
    const set: Document = { updatedAt: new Date() };
    const unset: Record<string, ''> = {};

    this.applyField(set, unset, 'resumeToken', progress.resumeToken);
    this.applyField(set, unset, 'lastForwardedId', progress.lastForwardedId);

    return { set, unset };
  }

  private applyField(
    set: Document,
    unset: Record<string, ''>,
    key: string,
    value: unknown
  ): void {
    if (value === undefined) {
      unset[key] = '';
      return;
    }

    set[key] = value;
  }
}
