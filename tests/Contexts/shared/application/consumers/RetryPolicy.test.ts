import { RetryPolicy } from '../../../../../src/Contexts/shared/application/consumers/index.js';
import { buildRetryConfig } from './retryConfig.fixture.js';

describe('RetryPolicy', () => {
  const policy = new RetryPolicy({ retry: buildRetryConfig() });

  it('nextDestination(0) routes to retry.5s as attempt 1', () => {
    expect(policy.nextDestination(0)).toEqual({
      kind: 'retry',
      topic: 'agro.domain.events.retry.5s',
      delayMs: 5000,
      attempt: 1
    });
  });

  it('nextDestination(1) routes to retry.30s as attempt 2', () => {
    expect(policy.nextDestination(1)).toEqual({
      kind: 'retry',
      topic: 'agro.domain.events.retry.30s',
      delayMs: 30000,
      attempt: 2
    });
  });

  it('nextDestination(2) routes to retry.5m as attempt 3', () => {
    expect(policy.nextDestination(2)).toEqual({
      kind: 'retry',
      topic: 'agro.domain.events.retry.5m',
      delayMs: 300000,
      attempt: 3
    });
  });

  it('nextDestination(maxRetries) routes to the DLQ', () => {
    expect(policy.nextDestination(3)).toEqual({
      kind: 'dead-letter',
      topic: 'agro.domain.events.dlq'
    });
  });

  it('exposes the dead-letter topic', () => {
    expect(policy.deadLetterTopic()).toBe('agro.domain.events.dlq');
  });
});
