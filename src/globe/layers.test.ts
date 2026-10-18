/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LAYER, layerOf } from './layers.ts';

const all = { visited: true, wish: true, unexplored: true };

test('a Country takes the colour of its Status', () => {
  assert.equal(layerOf('visited', all), LAYER.visited);
  assert.equal(layerOf('wish', all), LAYER.wish);
  assert.equal(layerOf('unexplored', all), LAYER.land);
});

test('hiding Visited or Wish leaves those Countries as plain land', () => {
  const none = { visited: false, wish: false, unexplored: true };
  assert.equal(layerOf('visited', none), LAYER.land);
  assert.equal(layerOf('wish', none), LAYER.land);
});

test('hiding Unexplored leaves only the outlines of those Countries', () => {
  assert.equal(layerOf('unexplored', { ...all, unexplored: false }), LAYER.outline);
});
