import type { AppLogger } from '../../plugins/logger.plugin.js';
import type { OutboxPendingWorkChecker } from './OutboxPendingWorkChecker.js';
import type { OutboxTailer } from './OutboxTailer.js';
import type { OutboxTailerStatus } from './OutboxTailerStatus.js';
import type { WatchdogClock } from './WatchdogClock.js';
import type { WatchdogScheduler } from './WatchdogScheduler.js';

export interface OutboxWatchdogConfig {
  intervalMs: number;
  stallTimeoutMs: number;
}

export interface OutboxWatchdogDependencies {
  tailer: OutboxTailer;
  pendingChecker: OutboxPendingWorkChecker;
  clock: WatchdogClock;
  scheduler: WatchdogScheduler;
  logger: AppLogger;
  exit: (code: number) => void;
  config: OutboxWatchdogConfig;
}

export class OutboxWatchdog {
  private readonly tailer: OutboxTailer;
  private readonly pendingChecker: OutboxPendingWorkChecker;
  private readonly clock: WatchdogClock;
  private readonly scheduler: WatchdogScheduler;
  private readonly logger: AppLogger;
  private readonly exit: (code: number) => void;
  private readonly config: OutboxWatchdogConfig;

  private startedAt = 0;
  private stopped = true;
  private isTicking = false;
  private lastSeenForwardedId: string | undefined;
  private lastProgressAt: number | undefined;
  private pendingObservedAt: number | undefined;

  constructor({
    tailer,
    pendingChecker,
    clock,
    scheduler,
    logger,
    exit,
    config
  }: OutboxWatchdogDependencies) {
    this.tailer = tailer;
    this.pendingChecker = pendingChecker;
    this.clock = clock;
    this.scheduler = scheduler;
    this.logger = logger;
    this.exit = exit;
    this.config = config;
  }

  public start(): void {
    this.startedAt = this.clock.now();
    this.lastProgressAt = this.startedAt;
    this.lastSeenForwardedId = undefined;
    this.pendingObservedAt = undefined;
    this.stopped = false;
    this.scheduler.start(this.config.intervalMs, () => {
      void this.tick();
    });
  }

  public stop(): void {
    this.stopped = true;
    this.scheduler.stop();
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.isTicking) {
      return;
    }

    this.isTicking = true;
    try {
      await this.evaluateTick();
    } finally {
      this.isTicking = false;
    }
  }

  private async evaluateTick(): Promise<void> {
    const status = this.tailer.status();
    if (!status.running) {
      this.handleStoppedTailer(status);
      return;
    }

    this.trackProgress(status.lastForwardedId);

    const pending = await this.checkPendingWork(status.lastForwardedId);
    if (pending === undefined || this.stopped) {
      return;
    }

    if (!pending) {
      this.pendingObservedAt = undefined;
      return;
    }

    this.checkStall(status);
  }

  private handleStoppedTailer(status: OutboxTailerStatus): void {
    this.logger.error('Outbox worker tailer stopped unexpectedly', {
      running: false,
      lastForwardedId: status.lastForwardedId,
      lastProgressAt: status.lastForwardedAt ?? status.startedAt
    });
    this.exit(1);
  }

  private trackProgress(lastForwardedId?: string): void {
    if (
      this.lastSeenForwardedId !== undefined &&
      lastForwardedId !== this.lastSeenForwardedId
    ) {
      this.lastProgressAt = this.clock.now();
      this.pendingObservedAt = undefined;
    }
    this.lastSeenForwardedId = lastForwardedId;
  }

  private async checkPendingWork(
    lastForwardedId?: string
  ): Promise<boolean | undefined> {
    try {
      return await this.pendingChecker.hasPendingWork(lastForwardedId);
    } catch (error) {
      this.logger.warn('Outbox watchdog pending work check failed', error);
      return undefined;
    }
  }

  private checkStall(status: OutboxTailerStatus): void {
    const now = this.clock.now();
    this.pendingObservedAt ??= now;
    const referenceAt = Math.max(
      this.lastProgressAt ?? this.startedAt,
      this.pendingObservedAt
    );
    const elapsed = now - referenceAt;

    if (elapsed > this.config.stallTimeoutMs) {
      this.logger.error('Outbox worker forwarding stalled with pending work', {
        elapsedMs: elapsed,
        stallTimeoutMs: this.config.stallTimeoutMs,
        lastForwardedId: status.lastForwardedId,
        lastProgressAt: status.lastForwardedAt ?? status.startedAt
      });
      this.exit(1);
    }
  }
}
