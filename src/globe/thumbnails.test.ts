/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HIDDEN, keepApart, OWN, PLACE, PHOTO_ZOOM, shownAs, thumbnailDiameter, TIER, type Thumbnail } from './thumbnails.ts';

// Japan is Country 0 of the Atlas, with Regions Kansai (0) and Kanto (1); France is Country 1;
// Okinawa, an Island of Japan, is 2.
const japan: Thumbnail = { tier: TIER.country, country: 0, region: -1, count: 5, ownCount: 2 };
const france: Thumbnail = { tier: TIER.country, country: 1, region: -1, count: 1, ownCount: 1 };
const okinawa: Thumbnail = { tier: TIER.country, country: 2, region: -1, count: 1, ownCount: 1 };
const kansai: Thumbnail = { tier: TIER.region, country: 0, region: 0, count: 2, ownCount: 0 };
const kanto: Thumbnail = { tier: TIER.region, country: 0, region: 1, count: 1, ownCount: 1 };
const kyoto: Thumbnail = { tier: TIER.city, country: 0, region: 0, count: 2, ownCount: 2 };
const tokyo: Thumbnail = { tier: TIER.city, country: 0, region: 1, count: 1, ownCount: 1 };
const naha: Thumbnail = { tier: TIER.city, country: 2, region: -1, count: 1, ownCount: 1 };
const nothing = { country: -1, region: -1 };

test('without a selection, only Countries and Islands show, and only from the photo zoom on', () => {
  for (const t of [japan, okinawa]) {
    assert.equal(shownAs(t, nothing, PHOTO_ZOOM - 0.1), HIDDEN);
    assert.equal(shownAs(t, nothing, PHOTO_ZOOM), PLACE);
  }
  for (const t of [kansai, kyoto, naha]) assert.equal(shownAs(t, nothing, 10), HIDDEN);
});

test('a Country selected shows its Regions and Cities at any zoom, and hides the other Countries and Islands', () => {
  const selected = { country: 0, region: -1 };
  for (const t of [kansai, kanto, kyoto, tokyo]) assert.equal(shownAs(t, selected, 1), PLACE);
  for (const t of [france, okinawa, naha]) assert.equal(shownAs(t, selected, 10), HIDDEN);
});

test('a Country selected keeps its own thumbnail only with Photos of its own, showing one of those', () => {
  assert.equal(shownAs(japan, { country: 0, region: -1 }, 3), OWN);
  assert.equal(shownAs({ ...japan, ownCount: 0 }, { country: 0, region: -1 }, 3), HIDDEN);
});

test('an Island selected shows its Cities', () => {
  assert.equal(shownAs(naha, { country: 2, region: -1 }, 1), PLACE);
  assert.equal(shownAs(okinawa, { country: 2, region: -1 }, 1), OWN);
});

test('a Region selected shows its Cities, and itself only with Photos of its own', () => {
  const inKansai = { country: 0, region: 0 };
  assert.equal(shownAs(kyoto, inKansai, 1), PLACE);
  assert.equal(shownAs(kansai, inKansai, 1), HIDDEN);
  assert.equal(shownAs(kanto, { country: 0, region: 1 }, 1), OWN);
  for (const t of [tokyo, kanto, japan, france]) assert.equal(shownAs(t, inKansai, 10), HIDDEN);
});

test('a thumbnail grows with the zoom, up to 38 points', () => {
  assert.equal(thumbnailDiameter(1), 21);
  assert.equal(thumbnailDiameter(4), 36);
  assert.equal(thumbnailDiameter(10), 38);
});

test('of thumbnails that collide, the one with the most Photos stays', () => {
  // Three in a row 20 points apart, then one far away: 30 points across, the middle one
  // collides with both of its neighbours, which do not collide with each other.
  const xs = [0, 20, 40, 300];
  const ys = [0, 0, 0, 0];
  const shown = [true, true, true, true];
  assert.deepEqual(keepApart(xs, ys, [1, 5, 1, 1], shown, 30), [false, true, false, true]);
  assert.deepEqual(keepApart(xs, ys, [3, 2, 3, 1], shown, 30), [true, false, true, true]);
});

test('a hidden thumbnail neither stays nor pushes another out; at equal Photos, the first stays', () => {
  assert.deepEqual(keepApart([0, 20], [0, 0], [9, 1], [false, true], 30), [false, true]);
  assert.deepEqual(keepApart([0, 20], [0, 0], [2, 2], [true, true], 30), [true, false]);
});
