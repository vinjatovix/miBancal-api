import type { RetryConfig } from './RetryConfig.js';

export type DelayDecision =
  { kind: 'proceed' } | { kind: 'defer'; remainingMs: number };

export class DelayGate {
  private readonly delayByTopic: ReadonlyMap<string, number>;

  constructor({ retry }: { retry: RetryConfig }) {
    this.delayByTopic = new Map(
      retry.levels.map((level) => [level.topic, level.delayMs])
    );
  }

  public evaluate(
    sourceTopic: string,
    enqueuedAt: Date | undefined,
    now: Date
  ): DelayDecision {
    const delayMs = this.delayByTopic.get(sourceTopic);
    if (delayMs === undefined || enqueuedAt === undefined) {
      return { kind: 'proceed' };
    }

    const elapsed = now.getTime() - enqueuedAt.getTime();
    const remainingMs = delayMs - elapsed;
    if (remainingMs <= 0) {
      return { kind: 'proceed' };
    }

    return { kind: 'defer', remainingMs };
  }
}
