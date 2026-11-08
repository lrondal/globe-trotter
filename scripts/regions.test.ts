/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import type { CountriesData } from '../src/atlas/countries.ts';
import { fileOf, urlOf, type RegionFeature, type Source } from './geoboundaries.ts';
import { buildRegions, checkRegions, regionNames } from './regions.ts';
import type { RegionIndex } from '../src/atlas/regions.ts';

const atlas: CountriesData = JSON.parse(readFileSync(new URL('../assets/data/countries.json', import.meta.url), 'utf8'));

/** A geoBoundaries Region drawn as a lon/lat box. */
const box = (id: string, [west, south, east, north]: number[]): RegionFeature => ({
  properties: { shapeID: id, shapeName: id },
  geometry: {
    type: 'Polygon',
    coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
  },
});

const source = (iso3: string): Source => ({ iso3, commit: 'test', license: 'test', source: 'test' });

const build = (features: Record<string, RegionFeature[]>) =>
  buildRegions(atlas, ({ iso3 }) => features[iso3], Object.keys(features).map(source));

test('a Region made of Islands is dropped, even with a sliver of mainland: Corse stays an Island', () => {
  const [corse, lyon] = [box('corse', [8.4, 41.3, 9.7, 43.1]), box('lyon', [4.8, 45.7, 4.9, 45.8])];
  const islands = {
    properties: corse.properties,
    geometry: { type: 'MultiPolygon' as const, coordinates: [corse, lyon].map((f) => f.geometry.coordinates as number[][][]) },
  };
  const { index } = build({ FRA: [islands, box('nord', [-5, 47, 10, 52])] });
  assert.deepEqual(index['250'].map((r) => r.id), ['nord']);
});

test('a Region is cut to its Country: its centre stays in France, off the sea and Belgium', () => {
  // Reaching over the Channel and into Belgium and Germany, the box would centre on 2.5° E 49.5° N.
  const { index } = build({ FRA: [box('nord', [-5, 47, 10, 52])] });
  const [{ lon, lat }] = index['250'];
  assert.ok(lon > -1.5 && lon < 8 && lat > 47 && lat < 51, `${lon} ${lat}`);
});

test('a Region of Somalia drawn in Somaliland goes to Somaliland', () => {
  const { index } = build({ SOM: [box('woqooyi-galbeed', [43.2, 9.2, 45, 10.4]), box('banaadir', [45.2, 1.9, 45.6, 2.2])] });
  assert.deepEqual(index['x-somaliland'].map((r) => r.id), ['woqooyi-galbeed']);
  assert.deepEqual(index['706'].map((r) => r.id), ['banaadir']);
});

test('the pipeline fails when a Country is left without Regions', () => {
  const built = build({ FRA: [box('nord', [-5, 47, 10, 52])] });
  assert.throws(() => checkRegions(atlas, built), /has no Regions/);
});

/** The names regionNames gives a source with these names, in order. */
const named = (...names: string[]) => [
  ...regionNames(names.map((name, i) => ({ ...box(`r${i}`, [0, 0, 1, 1]), properties: { shapeID: `r${i}`, shapeName: name } }))).values(),
];

test('a name read as Latin-1 is mended, and a stray tab trimmed', () => {
  assert.deepEqual(named('RegiÃ³n del BÃ­o-BÃ­o', 'Hà Nội\t'), ['Región del Bío-Bío', 'Hà Nội']);
});

test('a source writing its names in capitals is set in title case, particles kept low', () => {
  assert.deepEqual(named('VIANA DO CASTELO', 'BRAGANÃ\u0087A', 'Região Autónoma da Madeira'), [
    'Viana do Castelo',
    'Bragança',
    'Região Autónoma da Madeira',
  ]);
});

test('elsewhere, capitals are acronyms and kept', () => {
  assert.deepEqual(named('NCR', 'Ilocos Region', 'Bicol Region'), ['NCR', 'Ilocos Region', 'Bicol Region']);
});

test('a country can take another release or level than gbOpen ADM1, cached apart', () => {
  const italy: Source = { ...source('ITA'), commit: '9469f09', level: 'ADM2' };
  assert.match(urlOf(italy), /\/gbOpen\/ITA\/ADM2\/geoBoundaries-ITA-ADM2_simplified\.geojson$/);
  assert.equal(fileOf(italy), 'ITA-gbOpen-ADM2.geojson');
  assert.equal(fileOf(source('FRA')), 'FRA.geojson');
});

test('the shipped Regions are those a traveller knows, not statistical macro-regions (#33)', () => {
  const shipped: RegionIndex = JSON.parse(readFileSync(new URL('../assets/data/regions.json', import.meta.url), 'utf8'));
  const names = (id: string) => shipped[id].map((r) => r.name);
  assert.ok(names('380').includes('Toscana') && !names('380').includes('Centro'), 'Italy');
  assert.ok(names('300').includes('Péloponnèse') && !names('300').includes('Egean'), 'Greece');
  assert.equal(shipped['562'].length, 8, 'Niger');
  assert.ok(shipped['031'].length > 2, 'Azerbaijan');
  assert.ok(names('070').includes('Sarajevo Canton'), 'Bosnia and Herzegovina');
});
