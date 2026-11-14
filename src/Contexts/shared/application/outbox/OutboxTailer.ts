export interface OutboxTailer {
  start(): Promise<void>;
  stop(): Promise<void>;
}
