/* eslint-disable @typescript-eslint/require-await */
import type {
  PlantSummaryReader,
  PlantSummaryView
} from '../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';

export class PlantSummaryReaderMock implements PlantSummaryReader {
  readonly findSummariesByIdsMock = jest.fn();
  private readonly summaries = new Map<string, PlantSummaryView>();

  async findSummariesByIds(
    ids: readonly string[]
  ): Promise<readonly PlantSummaryView[]> {
    this.findSummariesByIdsMock(ids);

    return ids.flatMap((id) => {
      const summary = this.summaries.get(id);

      return summary ? [summary] : [];
    });
  }

  add(...summaries: PlantSummaryView[]): void {
    for (const summary of summaries) {
      this.summaries.set(summary.id, summary);
    }
  }

  assertCalledOnceWith(ids: readonly string[]): void {
    expect(this.findSummariesByIdsMock).toHaveBeenCalledTimes(1);
    expect(this.findSummariesByIdsMock).toHaveBeenCalledWith(ids);
  }

  assertNotCalled(): void {
    expect(this.findSummariesByIdsMock).not.toHaveBeenCalled();
  }
}
