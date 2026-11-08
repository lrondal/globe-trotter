/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { memoryBytes } from './memoryBytes.ts';
import { readZip, ZipError, zipWriter } from './zip.ts';

const utf8 = (s: string) => new TextEncoder().encode(s);

async function zipOf(entries: Record<string, Uint8Array>) {
  const bytes = memoryBytes();
  const zip = zipWriter(bytes.sink);
  for (const [name, data] of Object.entries(entries)) await zip.add(name, data);
  await zip.finish();
  return bytes;
}

test('a zip written gives back its entries, by name, with their bytes', async () => {
  const bytes = await zipOf({ 'voyages.json': utf8('{"a":1}'), 'photos/kyoto.jpg': new Uint8Array([0xff, 0xd8, 0, 1, 2]) });
  const zip = await readZip(bytes.source());
  assert.deepEqual(zip.names(), ['voyages.json', 'photos/kyoto.jpg']);
  assert.deepEqual(await zip.read('photos/kyoto.jpg'), new Uint8Array([0xff, 0xd8, 0, 1, 2]));
  assert.equal(new TextDecoder().decode(await zip.read('voyages.json')), '{"a":1}');
});

test('the zip written is one the system tools read: its CRC-32 is the standard one', async () => {
  // CRC-32 of "123456789" is 0xcbf43926, the standard check value.
  const bytes = await zipOf({ 'check.txt': utf8('123456789') });
  const all = bytes.all();
  const view = new DataView(all.buffer, all.byteOffset);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(14, true), 0xcbf43926);
});

test('a file that is no zip is refused', async () => {
  const bytes = memoryBytes(utf8('Bonjour, je ne suis pas un zip.'));
  await assert.rejects(readZip(bytes.source()), ZipError);
});

test('an empty file is refused', async () => {
  await assert.rejects(readZip(memoryBytes().source()), ZipError);
});

test('an entry whose bytes were altered is refused when read', async () => {
  const bytes = await zipOf({ 'a.txt': utf8('abcdef') });
  const all = bytes.all();
  // The entry's data follows its 30-byte local header and its 5-byte name.
  all[30 + 5] ^= 0xff;
  const zip = await readZip(memoryBytes(all).source());
  await assert.rejects(zip.read('a.txt'), ZipError);
});

test('reading an entry the zip does not hold is refused', async () => {
  const zip = await readZip((await zipOf({ 'a.txt': utf8('a') })).source());
  await assert.rejects(zip.read('b.txt'), ZipError);
});

test('a zip cut short is refused', async () => {
  const all = (await zipOf({ 'a.txt': utf8('abcdef') })).all();
  await assert.rejects(readZip(memoryBytes(all.slice(0, all.length - 10)).source()), ZipError);
});
