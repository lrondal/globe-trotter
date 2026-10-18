/// <reference types="node" />
// The Atlas on the real data the app ships (assets/), Regions read from their files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { NO_REGIONS } from '../../scripts/regions.ts';
import { openAtlas } from './atlas.ts';

const read = (path: string) => JSON.parse(readFileSync(new URL(`../../assets/${path}`, import.meta.url), 'utf8'));

const atlas = openAtlas({
  countries: read('data/countries.json'),
  regionIndex: read('data/regions.json'),
  loadRegions: async (countryId) => read(`regions/${countryId}.geo`),
});

/** What `locate` finds at a point, by name. */
async function namesAt(lon: number, lat: number) {
  const found = await atlas.locate({ lon, lat });
  return found && { country: found.country.name, island: found.island?.name, region: found.region?.name };
}

test('Paris is in France, in Île-de-France', async () => {
  assert.deepEqual(await namesAt(2.35, 48.86), { country: 'France', island: undefined, region: 'Île-de-France' });
});

test('Kyoto is in Japan, in Kyoto Prefecture', async () => {
  assert.deepEqual(await namesAt(135.77, 35.01), { country: 'Japon', island: undefined, region: 'Kyoto Prefecture' });
});

test('a point in Santorin is on the Island Santorin, of Greece, in no Region', async () => {
  assert.deepEqual(await namesAt(25.43, 36.4), { country: 'Grèce', island: 'Santorin', region: undefined });
});

test('Singapore and Malta can be located', async () => {
  assert.equal((await namesAt(103.82, 1.35))?.country, 'Singapour');
  assert.equal((await namesAt(14.45, 35.9))?.country, 'Malte');
});

test('a point at sea is in no Country', async () => {
  assert.equal(await atlas.locate({ lon: -30, lat: 40 }), null);
});

test('Pristina is in the Kosovo of the stable id x-kosovo, in a Region', async () => {
  const found = await atlas.locate({ lon: 21.16, lat: 42.66 });
  assert.equal(found?.country.id, 'x-kosovo');
  assert.ok(found?.region);
});

test('every Country has Regions, but for those the pipeline lists', () => {
  const without = atlas.countries.filter((c) => !c.countryId && atlas.regionsOf(c.id).length === 0).map((c) => c.id);
  assert.deepEqual(without.sort(), Object.keys(NO_REGIONS).sort());
  assert.equal(atlas.regionsOf('392').length, 47);
});

test('a Region is found by its id, with its Country', () => {
  const kyoto = atlas.regionsOf('392').find((r) => r.name === 'Kyoto Prefecture')!;
  assert.deepEqual(atlas.region(kyoto.id), { ...kyoto, countryId: '392' });
});
