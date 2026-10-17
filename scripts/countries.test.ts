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
