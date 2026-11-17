export type RetryLevelConfig = {
  label: string;
  topic: string;
  delayMs: number;
  attempt: number;
};

export type RetryConfig = {
  maxRetries: number;
  levels: readonly RetryLevelConfig[];
  dlqTopic: string;
  clientId: string;
  topicPartitions: number;
  replicationFactor: number;
};
