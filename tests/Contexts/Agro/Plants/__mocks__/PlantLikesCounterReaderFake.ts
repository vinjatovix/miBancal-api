import type { PlantLikesCounterRepository } from '../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';

export class PlantLikesCounterReaderFake implements PlantLikesCounterRepository {
  private readonly counts = new Map<string, number>();

  public increment(): Promise<void> {
    return Promise.resolve();
  }

  public decrement(): Promise<void> {
    return Promise.resolve();
  }

  public getLikesCount(plantId: string): Promise<number> {
    return Promise.resolve(this.counts.get(plantId) ?? 0);
  }

  public getLikesCounts(
    plantIds: readonly string[]
  ): Promise<Map<string, number>> {
    return Promise.resolve(
      new Map(plantIds.map((id) => [id, this.counts.get(id) ?? 0]))
    );
  }

  public set(plantId: string, count: number): void {
    this.counts.set(plantId, count);
  }
}
