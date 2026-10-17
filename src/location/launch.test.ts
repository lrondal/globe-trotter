/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { launchView, recenterAction } from './launch.ts';

test('without a known position the globe opens on 10° E, 45° N, whole', () => {
  assert.deepEqual(launchView(null), { lon: 10, lat: 45, zoom: 1 });
});

test('the globe opens whole, centred on the last known position', () => {
  assert.deepEqual(launchView({ lon: 139.7, lat: 35.7 }), { lon: 139.7, lat: 35.7, zoom: 1 });
});

test('a last known position beyond 60° opens at the tilt limit', () => {
  assert.deepEqual(launchView({ lon: -21.9, lat: 64.1 }), { lon: -21.9, lat: 60, zoom: 1 });
});

const granted = { granted: true, canAskAgain: true };
const undetermined = { granted: false, canAskAgain: true };
const refused = { granted: false, canAskAgain: false };

test('the recentre button flies to the position once it is known', () => {
  assert.equal(recenterAction({ lon: 2.35, lat: 48.85 }, granted), 'fly');
});

test('without the permission, the recentre button asks for it while the system still can', () => {
  assert.equal(recenterAction(null, undetermined), 'ask');
});

test('once the permission is refused for good, the recentre button explains how to turn it on', () => {
  assert.equal(recenterAction(null, refused), 'explain');
});

test('with the permission but no position yet, the recentre button locates the user first', () => {
  assert.equal(recenterAction(null, granted), 'locate');
});
