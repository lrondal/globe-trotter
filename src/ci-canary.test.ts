import test from 'node:test';
import assert from 'node:assert/strict';

test('deliberately broken test to verify CI goes red (to be reverted)', () => {
  assert.equal(1, 2);
});
