import type { OutboxRecord } from './OutboxRecord.js';

export interface EventForwarder {
  forward(record: OutboxRecord): Promise<void>;
}
