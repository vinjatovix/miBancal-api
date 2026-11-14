import type { Db } from 'mongodb';

export type MigrationCollection = {
  drop?(): Promise<boolean>;
};

export type MigrationDb = {
  collection(name: string): MigrationCollection;
  createCollection?(name: string): Promise<unknown>;
};

export declare const up: (db: MigrationDb | Db) => Promise<void>;
export declare const down: (db: MigrationDb | Db) => Promise<void>;
