import type { OutboxRecord } from './OutboxRecord.js';

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

export function derivePartitionKey(record: OutboxRecord): string {
  const payload = record.payload as Record<string, unknown>;

  if (nonEmptyString(payload.plantInstanceId)) {
    return payload.plantInstanceId;
  }

  if (nonEmptyString(payload.bedId)) {
    return payload.bedId;
  }

  return record.aggregateId;
}
