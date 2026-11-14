import type { ResumeToken } from 'mongodb';

export interface OutboxProgress {
  resumeToken?: ResumeToken;
  lastForwardedId?: string;
}

export interface OutboxProgressRepository {
  load(): Promise<OutboxProgress>;
  save(progress: OutboxProgress): Promise<void>;
}
