/* eslint-disable @typescript-eslint/require-await */
import type {
  FamilySummaryReader,
  FamilySummaryView
} from '../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';

export class PlantRelationFamilySummaryReaderMock implements FamilySummaryReader {
  readonly findByIdMock = jest.fn();

  private readonly storage = new Map<string, FamilySummaryView>();

  add(...families: readonly FamilySummaryView[]): void {
    for (const family of families) {
      this.storage.set(family.id, family);
    }
  }

  async findById(id: string): Promise<Nullable<FamilySummaryView>> {
    this.findByIdMock(id);

    return this.storage.get(id) ?? null;
  }

  assertNotCalled(): void {
    expect(this.findByIdMock).not.toHaveBeenCalled();
  }

  assertFindByIdHasBeenCalledWith(id: string): void {
    expect(this.findByIdMock).toHaveBeenCalledWith(id);
  }
}
