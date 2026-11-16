import type { Db } from 'mongodb';

export type MigrationIndexOptions = {
  name: string;
  unique?: boolean;
};

export type MigrationCollection = {
  createIndex(
    key: Record<string, number>,
    options: MigrationIndexOptions
  ): Promise<string>;
  dropIndex(name: string): Promise<unknown>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
};

export declare const up: (db: MigrationDb | Db) => Promise<void>;
export declare const down: (db: MigrationDb | Db) => Promise<void>;
