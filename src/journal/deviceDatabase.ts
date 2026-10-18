// The Journal's database on the phone: expo-sqlite, opened synchronously at startup.
import { openDatabaseSync } from 'expo-sqlite';

import type { Database } from './database';

export function deviceDatabase(): Database {
  const db = openDatabaseSync('journal.db');
  return {
    exec: (sql) => db.execSync(sql),
    run: (sql, params = []) => void db.runSync(sql, params),
    all: (sql, params = []) => db.getAllSync(sql, params),
  };
}
