import type {
  OutboxPendingWorkChecker,
  OutboxTailer,
  OutboxTailerStatus,
  WatchdogClock,
  WatchdogScheduler
} from '../../../../../src/Contexts/shared/application/outbox/index.js';
import { OutboxWatchdog } from '../../../../../src/Contexts/shared/application/outbox/OutboxWatchdog.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';

class FakeClock implements WatchdogClock {
  private currentMs = 1000;

  now(): number {
    return this.currentMs;
  }

  advance(ms: number): void {
    this.currentMs += ms;
  }
}

class FakeScheduler implements WatchdogScheduler {
  public intervalMs?: number;
  public tick?: () => void;
  public stopped = false;

  start(intervalMs: number, tick: () => void): void {
    this.intervalMs = intervalMs;
    this.tick = tick;
    this.stopped = false;
  }

  stop(): void {
    this.stopped = true;
  }

  async trigger(): Promise<void> {
    this.tick?.();
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
}

type HarnessOptions = {
  status?: Partial<OutboxTailerStatus>;
  hasPendingWork?: boolean;
  intervalMs?: number;
  stallTimeoutMs?: number;
};

const createHarness = (options: HarnessOptions = {}) => {
  const clock = new FakeClock();
  const scheduler = new FakeScheduler();
  const exit = jest.fn<void, [number]>();

  const logger: AppLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  let currentStatus: OutboxTailerStatus = {
    running: true,
    startedAt: new Date('2026-11-15T10:00:00.000Z'),
    lastForwardedAt: new Date('2026-11-15T10:00:05.000Z'),
    lastForwardedId: '01932f30-0000-7000-8000-000000000001',
    ...options.status
  };

  const tailer: OutboxTailer = {
    start: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    stop: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    status: jest.fn<OutboxTailerStatus, []>(() => currentStatus)
  };

  const hasPendingWork = jest
    .fn<Promise<boolean>, [string | undefined]>()
    .mockResolvedValue(options.hasPendingWork ?? true);

  const pendingChecker: OutboxPendingWorkChecker = {
    hasPendingWork
  };

  const config = {
    intervalMs: options.intervalMs ?? 5000,
    stallTimeoutMs: options.stallTimeoutMs ?? 30000
  };

  const watchdog = new OutboxWatchdog({
    tailer,
    pendingChecker,
    clock,
    scheduler,
    logger,
    exit,
    config
  });

  return {
    watchdog,
    clock,
    scheduler,
    tailer,
    pendingChecker,
    hasPendingWork,
    logger,
    exit,
    config,
    updateStatus: (newStatus: Partial<OutboxTailerStatus>) => {
      currentStatus = { ...currentStatus, ...newStatus };
    }
  };
};

describe('OutboxWatchdog - User Story 1: Stall Recovery', () => {
  it('exits with code 1 and logs error diagnostics when forwarding stalls with pending work past the threshold', async () => {
    const { watchdog, clock, scheduler, exit, logger, config } = createHarness({
      hasPendingWork: true,
      stallTimeoutMs: 30000
    });

    watchdog.start();
    await scheduler.trigger();

    clock.advance(config.stallTimeoutMs + 1000);
    await scheduler.trigger();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Outbox worker forwarding stalled with pending work',
      expect.objectContaining({
        elapsedMs: 31000,
        stallTimeoutMs: 30000,
        lastForwardedId: '01932f30-0000-7000-8000-000000000001',
        lastProgressAt: new Date('2026-11-15T10:00:05.000Z')
      })
    );
  });

  it('disarms deadline and does not exit when forward progress is observed before stall timeout', async () => {
    const { watchdog, clock, scheduler, exit, logger, updateStatus } =
      createHarness({
        hasPendingWork: true,
        stallTimeoutMs: 30000
      });

    watchdog.start();
    await scheduler.trigger();

    clock.advance(20000);
    updateStatus({
      lastForwardedId: '01932f30-0000-7000-8000-000000000002',
      lastForwardedAt: new Date('2026-11-15T10:00:25.000Z')
    });
    await scheduler.trigger();

    clock.advance(15000);
    await scheduler.trigger();

    expect(exit).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('skips concurrent ticks while an asynchronous pending work check is in flight', async () => {
    let resolvePending: (value: boolean) => void = (_val: boolean) => undefined;
    const { watchdog, scheduler, hasPendingWork, exit } = createHarness();
    hasPendingWork.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolvePending = resolve;
        })
    );

    watchdog.start();
    const tick1 = scheduler.trigger();
    const tick2 = scheduler.trigger();

    expect(hasPendingWork).toHaveBeenCalledTimes(1);

    resolvePending(false);
    await Promise.all([tick1, tick2]);

    expect(exit).not.toHaveBeenCalled();
  });

  it('logs warning and tolerates a transient database error without exiting', async () => {
    const dbError = new Error('MongoNetworkTimeoutException');
    const { watchdog, clock, scheduler, exit, logger, hasPendingWork, config } =
      createHarness();
    hasPendingWork.mockRejectedValueOnce(dbError).mockResolvedValueOnce(false);

    watchdog.start();
    await scheduler.trigger();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Outbox watchdog pending work check failed',
      dbError
    );
    expect(exit).not.toHaveBeenCalled();

    clock.advance(config.intervalMs);
    await scheduler.trigger();

    expect(exit).not.toHaveBeenCalled();
  });
});

describe('OutboxWatchdog - User Story 2: Silence on Idle Outbox', () => {
  it('never exits and leaves deadline disarmed while outbox remains idle past 5x stall threshold', async () => {
    const { watchdog, clock, scheduler, exit, logger, config } = createHarness({
      hasPendingWork: false,
      stallTimeoutMs: 30000
    });

    watchdog.start();

    for (let i = 0; i < 30; i += 1) {
      clock.advance(config.intervalMs);
      await scheduler.trigger();
    }

    expect(clock.now()).toBeGreaterThan(5 * config.stallTimeoutMs);
    expect(exit).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('provides a full fresh timeout window when an event is staged after a long idle period', async () => {
    const { watchdog, clock, scheduler, exit, logger, hasPendingWork, config } =
      createHarness({
        hasPendingWork: false,
        stallTimeoutMs: 30000
      });

    watchdog.start();
    clock.advance(120000);
    await scheduler.trigger();

    expect(exit).not.toHaveBeenCalled();

    hasPendingWork.mockResolvedValue(true);
    await scheduler.trigger();

    expect(exit).not.toHaveBeenCalled();

    clock.advance(config.stallTimeoutMs - 5000);
    await scheduler.trigger();

    expect(exit).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();

    clock.advance(6000);
    await scheduler.trigger();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});

describe('OutboxWatchdog - User Story 3: Stopped-Tailer and Graceful Shutdown', () => {
  it('exits with code 1 and logs error when tailer is not running while not stopped', async () => {
    const { watchdog, scheduler, exit, logger } = createHarness({
      status: { running: false }
    });

    watchdog.start();
    await scheduler.trigger();

    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Outbox worker tailer stopped unexpectedly',
      expect.objectContaining({
        running: false,
        lastForwardedId: '01932f30-0000-7000-8000-000000000001',
        lastProgressAt: new Date('2026-11-15T10:00:05.000Z')
      })
    );
  });

  it('does not exit during or after stop is called', async () => {
    const { watchdog, scheduler, exit, logger } = createHarness({
      status: { running: false }
    });

    watchdog.start();
    watchdog.stop();
    await scheduler.trigger();

    expect(exit).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('suppresses exit when stop is called while an async check was in flight', async () => {
    let resolvePending: (value: boolean) => void = (_val: boolean) => undefined;
    const { watchdog, clock, scheduler, exit, logger, hasPendingWork, config } =
      createHarness();
    hasPendingWork.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolvePending = resolve;
        })
    );

    watchdog.start();
    clock.advance(config.stallTimeoutMs + 1000);
    const triggerPromise = scheduler.trigger();

    watchdog.stop();
    resolvePending(true);
    await triggerPromise;

    expect(exit).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
