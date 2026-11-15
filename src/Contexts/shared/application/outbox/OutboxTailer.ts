import type { OutboxTailerStatus } from './OutboxTailerStatus.js';

export interface OutboxTailer {
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): OutboxTailerStatus;
}
