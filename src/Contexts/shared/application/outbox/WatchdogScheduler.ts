export interface WatchdogScheduler {
  start(intervalMs: number, tick: () => void): void;
  stop(): void;
}
