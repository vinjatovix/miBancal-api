export interface PlantLikesCounterRepository {
  increment(plantId: string): Promise<void>;
  decrement(plantId: string): Promise<void>;
  getLikesCount(plantId: string): Promise<number>;
  getLikesCounts(plantIds: readonly string[]): Promise<Map<string, number>>;
}
