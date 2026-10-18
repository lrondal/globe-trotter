// The storage the Journal writes through: a SQLite database, synchronous. On the phone it is
// expo-sqlite (deviceDatabase.ts); in the Node tests, node:sqlite in memory (memoryDatabase.ts).

export type SqlValue = string | number | null;

export type Database = {
  /** Runs one or more statements without parameters, e.g. a migration. */
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): void;
  all<Row>(sql: string, params?: SqlValue[]): Row[];
};
