export interface ProcessedEventsRepository {
  claim(consumer: string, eventId: string, processedAt?: Date): Promise<void>;
  has(consumer: string, eventId: string): Promise<boolean>;
  count(): Promise<number>;
}
