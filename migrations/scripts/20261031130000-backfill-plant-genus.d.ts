import type { Db } from 'mongodb';

export type MigrationDocument = {
  _id: unknown;
  identity: {
    scientificName: string;
    genus?: string;
  };
};

export type MigrationFindCursor = {
  toArray(): Promise<MigrationDocument[]>;
};

export type MigrationCollection = {
  find(
    filter: Record<string, unknown>,
    options?: Record<string, unknown>
  ): MigrationFindCursor;
  bulkWrite(
    ops: Array<{
      updateOne: {
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
      };
    }>,
    options?: Record<string, unknown>
  ): Promise<unknown>;
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<unknown>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb | Db) => Promise<void>;
export declare const down: (db: MigrationDb | Db) => Promise<void>;
