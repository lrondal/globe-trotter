/// <reference types="node" />
// The position is never stored nor exported (#16): the code that reads it must not reach
// any storage. This catches a storage import slipping into it, not data passed elsewhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const STORAGE = /from '(expo-sqlite|expo-file-system|expo-secure-store|@react-native-async-storage\/[^']+)'/;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

test('no code that reads the position imports a storage module', () => {
  const readers = sources(SRC).filter((file) => readFileSync(file, 'utf8').includes("from 'expo-location'"));
  assert.ok(readers.length > 0, 'something reads the position');
  for (const file of readers) assert.doesNotMatch(readFileSync(file, 'utf8'), STORAGE, file);
});
