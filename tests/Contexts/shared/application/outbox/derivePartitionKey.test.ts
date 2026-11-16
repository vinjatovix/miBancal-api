import { derivePartitionKey } from '../../../../../src/Contexts/shared/application/outbox/index.js';
import type { OutboxRecord } from '../../../../../src/Contexts/shared/application/outbox/index.js';

const buildRecord = (payload: object): OutboxRecord => ({
  eventId: '0193a000-0000-7000-8000-000000000001',
  eventName: 'bed.deleted',
  aggregateId: 'aggregate-7',
  occurredAt: new Date('2026-11-15T10:00:00.000Z'),
  payload,
  createdAt: new Date('2026-11-15T10:00:01.000Z')
});

describe('derivePartitionKey', () => {
  it('uses payload.plantInstanceId first when it is a non-empty string (priority 1)', () => {
    const record = buildRecord({
      plantInstanceId: 'plant-instance-1',
      bedId: 'bed-9'
    });

    expect(derivePartitionKey(record)).toBe('plant-instance-1');
  });

  it('falls back to payload.bedId when plantInstanceId is absent (priority 2)', () => {
    const record = buildRecord({ bedId: 'bed-9' });

    expect(derivePartitionKey(record)).toBe('bed-9');
  });

  it('falls back to record.aggregateId when neither scoped id is present (priority 3)', () => {
    const record = buildRecord({ plantId: 'plant-5', userId: 'user-2' });

    expect(derivePartitionKey(record)).toBe('aggregate-7');
  });

  it('ignores empty or non-string scoped ids and uses the next priority', () => {
    expect(derivePartitionKey(buildRecord({ plantInstanceId: '' }))).toBe(
      'aggregate-7'
    );
    expect(
      derivePartitionKey(buildRecord({ plantInstanceId: 42, bedId: 'bed-3' }))
    ).toBe('bed-3');
    expect(derivePartitionKey(buildRecord({ bedId: '' }))).toBe('aggregate-7');
  });
});
