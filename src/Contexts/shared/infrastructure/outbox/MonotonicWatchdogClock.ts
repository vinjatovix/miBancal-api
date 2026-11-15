import type { WatchdogClock } from '../../application/outbox/WatchdogClock.js';

export class MonotonicWatchdogClock implements WatchdogClock {
  now(): number {
    return performance.now();
  }
}
