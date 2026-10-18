/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { buildCountries } from './countries.ts';

const require = createRequire(import.meta.url);
const world50m = () => structuredClone(require('world-atlas/countries-50m.json'));

test('every 50m Country gets its ISO numeric id and its French name', () => {
  const { countries } = buildCountries(world50m());
  const byId = new Map(countries.map((c) => [c.id, c.name]));
  assert.equal(byId.get('250'), 'France');
  assert.equal(byId.get('392'), 'Japon');
  assert.equal(byId.get('840'), 'États-Unis');
  assert.equal(byId.get('304'), 'Groenland');
  assert.equal(byId.get('344'), 'Hong Kong');
  assert.equal(new Set(countries.map((c) => c.id)).size, countries.length, 'ids are unique');
});

test('map entities without an ISO code get stable x- ids and French names', () => {
  const { countries } = buildCountries(world50m());
  const byId = new Map(countries.map((c) => [c.id, c.name]));
  assert.equal(byId.get('x-kosovo'), 'Kosovo');
  assert.equal(byId.get('x-somaliland'), 'Somaliland');
  assert.equal(byId.get('x-northern-cyprus'), 'Chypre du Nord');
  assert.equal(byId.get('x-indian-ocean-territories'), "Territoires australiens de l'océan Indien");
  assert.equal(byId.get('x-siachen-glacier'), 'Glacier de Siachen');
  assert.ok(!countries.some((c) => c.id === 'undefined'));
});

test('the pipeline fails when a country is missing from the map', () => {
  const world = world50m();
  world.objects.countries.geometries = world.objects.countries.geometries.filter(
    (g: { id?: string }) => g.id !== '392' && g.id !== '470',
  );
  assert.throws(() => buildCountries(world), /Japon.*Malte|Malte.*Japon/);
});

test('the pipeline fails when an entity without ISO code has no x- id', () => {
  const world = world50m();
  world.objects.countries.geometries.push({ type: null, properties: { name: 'Atlantis' } });
  assert.throws(() => buildCountries(world), /Atlantis/);
});

// The Journal stores these ids: the list only ever grows.
const ISLAND_IDS = [
  'i-acores', 'i-alaska', 'i-andaman', 'i-bali', 'i-bohol', 'i-bornholm', 'i-brac', 'i-cebu',
  'i-cephalonie', 'i-chiloe', 'i-corfou', 'i-corse', 'i-cozumel', 'i-crete', 'i-djerba', 'i-elbe',
  'i-flores', 'i-formentera', 'i-fuerteventura', 'i-galapagos', 'i-gotland', 'i-grande-canarie',
  'i-guadeloupe', 'i-guyane', 'i-hainan', 'i-hawaii', 'i-hvar', 'i-ibiza', 'i-ile-de-paques',
  'i-ile-du-prince-edouard', 'i-ishigaki', 'i-jeju', 'i-kangaroo-island', 'i-kauai', 'i-kgari',
  'i-koh-chang', 'i-koh-phangan', 'i-koh-samui', 'i-komodo', 'i-korcula', 'i-kos', 'i-krk',
  'i-la-gomera', 'i-la-palma', 'i-langkawi', 'i-lanzarote', 'i-lesbos', 'i-lewis-et-harris',
  'i-lofoten', 'i-lombok', 'i-madere', 'i-majorque', 'i-margarita', 'i-martinique', 'i-maui',
  'i-mayotte', 'i-minorque', 'i-mykonos', 'i-naxos', 'i-nosy-be', 'i-oahu', 'i-okinawa',
  'i-orcades', 'i-palawan', 'i-paros', 'i-pemba', 'i-penang', 'i-phu-quoc', 'i-phuket',
  'i-reunion', 'i-rhodes', 'i-roatan', 'i-rugen', 'i-saaremaa', 'i-santorin', 'i-sardaigne',
  'i-shetland', 'i-siargao', 'i-sicile', 'i-skye', 'i-socotra', 'i-sylt', 'i-tasmanie',
  'i-tenerife', 'i-terre-de-feu', 'i-terre-neuve', 'i-tobago', 'i-vancouver', 'i-wight',
  'i-yakushima', 'i-zante', 'i-zanzibar',
];

test('every Island of the list is an entity of its own, with its Country', () => {
  const { countries } = buildCountries(world50m());
  const byId = new Map(countries.map((c) => [c.id, c]));
  assert.deepEqual(
    countries.filter((c) => c.id.startsWith('i-')).map((c) => c.id).sort(),
    ISLAND_IDS,
  );
  assert.deepEqual(
    countries.filter((c) => c.id.startsWith('x-')).map((c) => c.id).sort(),
    ['x-indian-ocean-territories', 'x-kosovo', 'x-northern-cyprus', 'x-siachen-glacier', 'x-somaliland'],
  );
  assert.equal(byId.get('i-crete')?.name, 'Crète');
  assert.equal(byId.get('i-crete')?.countryId, '300');
  assert.equal(byId.get('i-alaska')?.countryId, '840');
  assert.equal(byId.get('i-terre-de-feu')?.countryId, '032');
  assert.equal(byId.get('300')?.countryId, undefined);
  for (const c of countries) if (c.countryId) assert.ok(byId.has(c.countryId), `${c.id}: no Country ${c.countryId}`);
});

test('an Island takes its polygons out of its Country', () => {
  const plain = buildCountries(world50m(), []).countries;
  const { countries } = buildCountries(world50m());
  const polygons = (list: typeof countries, id: string) => list.find((c) => c.id === id)!.polygons.length;
  // Greece loses its 11 listed islands; Alaska takes every US polygon in the north-west.
  assert.equal(polygons(countries, '300'), polygons(plain, '300') - 11);
  assert.ok(polygons(countries, 'i-alaska') > 50);
});

const island = (id: `i-${string}`, points: [number, number][]) => ({ id, name: id, countryId: '300', points });

test('the pipeline fails when an Island point falls in no polygon of its Country', () => {
  // Athens' sea, then Istanbul: in no Greek polygon.
  assert.throws(() => buildCountries(world50m(), [island('i-nowhere', [[24.5, 37.0]])]), /i-nowhere/);
  assert.throws(() => buildCountries(world50m(), [island('i-istanbul', [[28.97, 41.01]])]), /i-istanbul/);
});

test('the pipeline fails when two Islands claim the same polygon', () => {
  const twice = [island('i-crete', [[24.9, 35.25]]), island('i-kriti', [[25.5, 35.2]])];
  assert.throws(() => buildCountries(world50m(), twice), /i-kriti.*i-crete|i-crete.*i-kriti/);
});
