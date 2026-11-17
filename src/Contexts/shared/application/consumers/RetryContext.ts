import type { RetryConfig } from './RetryConfig.js';

export const RETRY_HEADER = {
  attempt: 'x-retry-attempt',
  enqueuedAt: 'x-retry-enqueued-at',
  firstFailedAt: 'x-retry-first-failed-at',
  lastError: 'x-retry-last-error',
  failingConsumers: 'x-retry-failing-consumers',
  deadLetteredAt: 'x-dlq-dead-lettered-at'
} as const;

export const LAST_ERROR_MAX_LENGTH = 512;

export type MessageHeaders = Record<
  string,
  Buffer | string | (Buffer | string)[] | undefined
>;

export type AttemptResult =
  | { kind: 'fresh'; attempt: 0 }
  | { kind: 'valid'; attempt: number }
  | { kind: 'corrupt' };

export type RetryHeaderInput = {
  attempt: number;
  firstFailedAt: Date | undefined;
  lastError: string;
  failingConsumers: readonly string[];
  now: Date;
};

const decodeHeader = (value: MessageHeaders[string]): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const scalar = Array.isArray(value) ? value[0] : value;
  if (scalar === undefined) {
    return undefined;
  }
  return Buffer.isBuffer(scalar) ? scalar.toString('utf8') : scalar;
};

const truncate = (value: string, max: number): string =>
  value.length > max ? value.slice(0, max) : value;

export class RetryContext {
  private readonly maxRetries: number;
  private readonly retryTopics: ReadonlySet<string>;

  constructor({ retry }: { retry: RetryConfig }) {
    this.maxRetries = retry.maxRetries;
    this.retryTopics = new Set(retry.levels.map((level) => level.topic));
  }

  public isRetryTopic(sourceTopic: string): boolean {
    return this.retryTopics.has(sourceTopic);
  }

  public buildRetryHeaders(input: RetryHeaderInput): Record<string, string> {
    return {
      [RETRY_HEADER.attempt]: String(input.attempt),
      [RETRY_HEADER.enqueuedAt]: input.now.toISOString(),
      [RETRY_HEADER.firstFailedAt]: (
        input.firstFailedAt ?? input.now
      ).toISOString(),
      [RETRY_HEADER.lastError]: truncate(
        input.lastError,
        LAST_ERROR_MAX_LENGTH
      ),
      [RETRY_HEADER.failingConsumers]: input.failingConsumers.join(',')
    };
  }

  public readAttempt(
    sourceTopic: string,
    headers: MessageHeaders
  ): AttemptResult {
    if (!this.isRetryTopic(sourceTopic)) {
      return { kind: 'fresh', attempt: 0 };
    }

    const raw = decodeHeader(headers[RETRY_HEADER.attempt]);
    if (raw === undefined) {
      return { kind: 'corrupt' };
    }

    const attempt = Number(raw);
    if (
      !Number.isInteger(attempt) ||
      attempt <= 0 ||
      attempt > this.maxRetries
    ) {
      return { kind: 'corrupt' };
    }

    return { kind: 'valid', attempt };
  }

  public readFirstFailedAt(headers: MessageHeaders): Date | undefined {
    return this.parseDate(decodeHeader(headers[RETRY_HEADER.firstFailedAt]));
  }

  public readEnqueuedAt(headers: MessageHeaders): Date | undefined {
    return this.parseDate(decodeHeader(headers[RETRY_HEADER.enqueuedAt]));
  }

  private parseDate(raw: string | undefined): Date | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
