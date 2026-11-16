export interface ProcessedEventsRepository {
  claim(eventId: string, processedAt?: Date): Promise<void>;
  has(eventId: string): Promise<boolean>;
  count(): Promise<number>;
}
