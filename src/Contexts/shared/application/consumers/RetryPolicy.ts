import type { RetryConfig, RetryLevelConfig } from './RetryConfig.js';

export type RetryLevelDestination = {
  kind: 'retry';
  topic: string;
  delayMs: number;
  attempt: number;
};

export type DeadLetterDestination = {
  kind: 'dead-letter';
  topic: string;
};

export type RetryDestination = RetryLevelDestination | DeadLetterDestination;

export class RetryPolicy {
  private readonly maxRetries: number;
  private readonly levels: readonly RetryLevelConfig[];
  private readonly dlqTopic: string;

  constructor({ retry }: { retry: RetryConfig }) {
    this.maxRetries = retry.maxRetries;
    this.levels = retry.levels;
    this.dlqTopic = retry.dlqTopic;
  }

  public deadLetterTopic(): string {
    return this.dlqTopic;
  }

  public nextDestination(currentAttempt: number): RetryDestination {
    if (currentAttempt < this.maxRetries) {
      const level = this.levels[currentAttempt];
      if (level !== undefined) {
        return {
          kind: 'retry',
          topic: level.topic,
          delayMs: level.delayMs,
          attempt: currentAttempt + 1
        };
      }
    }

    return { kind: 'dead-letter', topic: this.dlqTopic };
  }
}
