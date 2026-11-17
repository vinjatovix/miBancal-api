import type { RetryConfig } from '../../../../../src/Contexts/shared/application/consumers/index.js';

export const buildRetryConfig = (
  overrides: Partial<RetryConfig> = {}
): RetryConfig => ({
  maxRetries: 3,
  levels: [
    {
      label: '5s',
      topic: 'agro.domain.events.retry.5s',
      delayMs: 5000,
      attempt: 1
    },
    {
      label: '30s',
      topic: 'agro.domain.events.retry.30s',
      delayMs: 30000,
      attempt: 2
    },
    {
      label: '5m',
      topic: 'agro.domain.events.retry.5m',
      delayMs: 300000,
      attempt: 3
    }
  ],
  dlqTopic: 'agro.domain.events.dlq',
  clientId: 'agro-domain-events-consumer-producer',
  topicPartitions: 6,
  replicationFactor: 1,
  ...overrides
});
