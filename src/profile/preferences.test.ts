/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readPreferences, writePreference, type KeyValueStore } from './preferences.ts';

/** A store kept in memory, as the phone's keeps it across launches. */
function memoryStore(): KeyValueStore {
  const items = new Map<string, string>();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) };
}

test('at first, Photos show on the globe and it does not turn on its own', () => {
  assert.deepEqual(readPreferences(memoryStore()), { photosOnGlobe: true, autoRotate: false });
});

test('a preference set is read back, the others as they were', () => {
  const store = memoryStore();
  writePreference(store, 'autoRotate', true);
  assert.deepEqual(readPreferences(store), { photosOnGlobe: true, autoRotate: true });
  writePreference(store, 'photosOnGlobe', false);
  writePreference(store, 'autoRotate', false);
  assert.deepEqual(readPreferences(store), { photosOnGlobe: false, autoRotate: false });
});

test('a value the app does not know reads as the default', () => {
  const store = memoryStore();
  store.setItem('autoRotate', 'maybe');
  assert.equal(readPreferences(store).autoRotate, false);
});
