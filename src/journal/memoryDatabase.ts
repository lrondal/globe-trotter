/// <reference types="node" />
// A real SQLite database held in memory, for the Node tests.
import { DatabaseSync } from 'node:sqlite';

import type { Database } from './database.ts';

export function memoryDatabase(): Database {
  const db = new DatabaseSync(':memory:');
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params = []) => void db.prepare(sql).run(...params),
    all: <Row>(sql: string, params: (string | number | null)[] = []) => db.prepare(sql).all(...params) as Row[],
  };
}
