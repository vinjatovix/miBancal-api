import type { KafkaDomainEventEnvelope } from '../../domain/events/index.js';
import type { AppLogger } from '../../plugins/index.js';
import type { ConsumerDispatchFailure } from './ConsumerDispatchFailure.js';
import type { FailureClassifier } from './FailureClassifier.js';
import type { MessagePublisher } from './MessagePublisher.js';
import {
  LAST_ERROR_MAX_LENGTH,
  type MessageHeaders,
  RETRY_HEADER,
  type RetryContext
} from './RetryContext.js';
import type { RetryDestination, RetryPolicy } from './RetryPolicy.js';

export const DEAD_LETTER_LOG_EVENT = 'domain-event.dead-lettered';

export type RouteOutcome = { kind: 'republished' } | { kind: 'dead-lettered' };

export type RouteInput = {
  sourceTopic: string;
  key: string;
  value: Buffer;
  headers: MessageHeaders;
  attempt: number;
  corrupt: boolean;
  failure?: ConsumerDispatchFailure;
  envelope: KafkaDomainEventEnvelope;
  now: Date;
};

const CORRUPT_RETRY_CONTEXT_SUMMARY =
  'CorruptRetryContext: invalid or missing x-retry-attempt header';

export type RetryRouterDependencies = {
  messagePublisher: MessagePublisher;
  retryPolicy: RetryPolicy;
  failureClassifier: FailureClassifier;
  retryContext: RetryContext;
  logger: AppLogger;
};

const summarizeError = (error: unknown): string => {
  const summary =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return summary.length > LAST_ERROR_MAX_LENGTH
    ? summary.slice(0, LAST_ERROR_MAX_LENGTH)
    : summary;
};

export class RetryRouter {
  private readonly publisher: MessagePublisher;
  private readonly retryPolicy: RetryPolicy;
  private readonly classifier: FailureClassifier;
  private readonly retryContext: RetryContext;
  private readonly logger: AppLogger;

  constructor({
    messagePublisher,
    retryPolicy,
    failureClassifier,
    retryContext,
    logger
  }: RetryRouterDependencies) {
    this.publisher = messagePublisher;
    this.retryPolicy = retryPolicy;
    this.classifier = failureClassifier;
    this.retryContext = retryContext;
    this.logger = logger;
  }

  public async route(input: RouteInput): Promise<RouteOutcome> {
    const destination = this.resolveDestination(input);
    const lastError = input.corrupt
      ? CORRUPT_RETRY_CONTEXT_SUMMARY
      : summarizeError(input.failure?.failures[0]?.error);
    const failingConsumers = input.failure?.failingConsumers() ?? [];
    const firstFailedAt = this.retryContext.readFirstFailedAt(input.headers);

    if (destination.kind === 'retry') {
      return this.republish(input, destination, {
        lastError,
        failingConsumers,
        firstFailedAt
      });
    }

    return this.deadLetter(input, destination, {
      lastError,
      failingConsumers,
      firstFailedAt
    });
  }

  private resolveDestination(input: RouteInput): RetryDestination {
    const nonRetryable =
      input.failure !== undefined &&
      this.classifier.isAggregateNonRetryable(input.failure);
    if (input.corrupt || nonRetryable) {
      return {
        kind: 'dead-letter',
        topic: this.retryPolicy.deadLetterTopic()
      };
    }
    return this.retryPolicy.nextDestination(input.attempt);
  }

  private async republish(
    input: RouteInput,
    destination: Extract<RetryDestination, { kind: 'retry' }>,
    metadata: RetryMetadata
  ): Promise<RouteOutcome> {
    const headers = this.retryContext.buildRetryHeaders({
      attempt: destination.attempt,
      firstFailedAt: metadata.firstFailedAt,
      lastError: metadata.lastError,
      failingConsumers: metadata.failingConsumers,
      now: input.now
    });

    await this.publisher.send({
      topic: destination.topic,
      key: input.key,
      value: input.value,
      headers
    });

    return { kind: 'republished' };
  }

  private async deadLetter(
    input: RouteInput,
    destination: Extract<RetryDestination, { kind: 'dead-letter' }>,
    metadata: RetryMetadata
  ): Promise<RouteOutcome> {
    const deadLetteredAt = input.now.toISOString();
    const headers = {
      ...this.retryContext.buildRetryHeaders({
        attempt: input.attempt,
        firstFailedAt: metadata.firstFailedAt,
        lastError: metadata.lastError,
        failingConsumers: metadata.failingConsumers,
        now: input.now
      }),
      [RETRY_HEADER.deadLetteredAt]: deadLetteredAt
    };

    await this.publisher.send({
      topic: destination.topic,
      key: input.key,
      value: input.value,
      headers
    });

    this.logger.error('Domain event dead-lettered', undefined, {
      event: DEAD_LETTER_LOG_EVENT,
      eventId: input.envelope.eventId,
      eventName: input.envelope.eventName,
      attempt: input.attempt,
      failingConsumers: metadata.failingConsumers,
      lastError: metadata.lastError,
      deadLetteredAt
    });

    return { kind: 'dead-lettered' };
  }
}

type RetryMetadata = {
  lastError: string;
  failingConsumers: string[];
  firstFailedAt: Date | undefined;
};
