import type { OutboxRecord } from '../../../../../src/Contexts/shared/application/outbox/index.js';
import { LoggingEventForwarder } from '../../../../../src/Contexts/shared/infrastructure/outbox/index.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';

const buildLogger = (): jest.Mocked<AppLogger> => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

const buildRecord = (overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
  eventId: '019316b0-0000-7000-8000-000000000001',
  eventName: 'bed.deleted',
  aggregateId: 'bed-1',
  occurredAt: new Date('2026-11-14T10:00:00.000Z'),
  payload: { id: 'bed-1' },
  createdAt: new Date('2026-11-14T10:00:01.000Z'),
  ...overrides
});

describe('LoggingEventForwarder', () => {
  it('logs each forwarded record at info with its identifying fields', async () => {
    const logger = buildLogger();
    const forwarder = new LoggingEventForwarder({ logger });
    const record = buildRecord();

    await forwarder.forward(record);

    expect(logger.info).toHaveBeenCalledTimes(1);
    const message = logger.info.mock.calls[0]?.[0];
    expect(message).toContain(record.eventId);
    expect(message).toContain(record.eventName);
    expect(message).toContain(record.aggregateId);
    expect(message).toContain(record.occurredAt.toISOString());
  });

  it('produces no side effects beyond logging (no warn/error)', async () => {
    const logger = buildLogger();
    const forwarder = new LoggingEventForwarder({ logger });

    await forwarder.forward(buildRecord());

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('resolves for every well-formed record', async () => {
    const logger = buildLogger();
    const forwarder = new LoggingEventForwarder({ logger });

    await expect(forwarder.forward(buildRecord())).resolves.toBeUndefined();
  });
});
