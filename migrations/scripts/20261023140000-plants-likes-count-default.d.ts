import type { Db } from 'mongodb';

export type MigrationUpdateResult = {
  matchedCount: number;
  modifiedCount: number;
};

export type MigrationCollection = {
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<MigrationUpdateResult>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb | Db) => Promise<void>;
export declare const down: (db: MigrationDb | Db) => Promise<void>;
