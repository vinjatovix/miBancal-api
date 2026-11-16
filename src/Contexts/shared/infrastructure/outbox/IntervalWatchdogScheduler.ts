import type { WatchdogScheduler } from '../../application/outbox/WatchdogScheduler.js';

export class IntervalWatchdogScheduler implements WatchdogScheduler {
  private timer: NodeJS.Timeout | undefined;

  start(intervalMs: number, tick: () => void): void {
    this.stop();
    const timer = setInterval(tick, intervalMs);
    timer.unref();
    this.timer = timer;
  }

  stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
