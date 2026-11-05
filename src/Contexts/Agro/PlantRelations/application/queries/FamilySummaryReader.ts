import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';

export type FamilySummaryView = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export interface FamilySummaryReader {
  findById(id: string): Promise<Nullable<FamilySummaryView>>;
}
