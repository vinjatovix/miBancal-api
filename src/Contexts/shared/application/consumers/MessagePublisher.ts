export type OutboundMessage = {
  topic: string;
  key: string;
  value: Buffer;
  headers: Record<string, string>;
};

export interface MessagePublisher {
  send(message: OutboundMessage): Promise<void>;
  ensureTopics(topics: string[]): Promise<void>;
}
