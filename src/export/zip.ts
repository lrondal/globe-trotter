// A zip file, as an Export is: its entries stored as they are, uncompressed (the Photos are
// JPEGs, which do not compress), each checked by its CRC-32 when read. Written and read a piece
// at a time, so that a Photo is the most it holds in memory. Only what an Export needs: no
// compression, no zip64 (4 GB at most), no encryption; any other zip is refused.
import type { ByteSink, ByteSource } from './bytes.ts';

/** A file that is not a zip this module reads, or whose bytes are damaged. */
export class ZipError extends Error {}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const END_OF_CENTRAL = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const END_SIZE = 22;
/** The end record may be followed by a comment, 65 535 bytes at most. */
const END_SEARCH = END_SIZE + 0xffff;
/** Version 2.0, the first with folders; general flag bit 11: names in UTF-8. */
const VERSION = 20;
const UTF8_NAMES = 1 << 11;
const STORED = 0;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

type Entry = { name: string; crc: number; size: number; offset: number };

/** Writes a zip to `sink`, entry by entry; finish() ends it. */
export function zipWriter(sink: ByteSink) {
  const entries: Entry[] = [];
  let offset = 0;
  const write = async (bytes: Uint8Array) => {
    await sink.write(bytes);
    offset += bytes.length;
  };
  return {
    async add(name: string, data: Uint8Array) {
      const nameBytes = new TextEncoder().encode(name);
      const entry = { name, crc: crc32(data), size: data.length, offset };
      const header = new Uint8Array(LOCAL_HEADER_SIZE + nameBytes.length);
      const view = new DataView(header.buffer);
      view.setUint32(0, LOCAL_HEADER, true);
      view.setUint16(4, VERSION, true);
      view.setUint16(6, UTF8_NAMES, true);
      view.setUint16(8, STORED, true);
      // 10–13: time and date, left at zero.
      view.setUint32(14, entry.crc, true);
      view.setUint32(18, entry.size, true);
      view.setUint32(22, entry.size, true);
      view.setUint16(26, nameBytes.length, true);
      header.set(nameBytes, LOCAL_HEADER_SIZE);
      await write(header);
      await write(data);
      entries.push(entry);
    },
    /** Writes the central directory, which lists the entries: the zip is complete. */
    async finish() {
      const start = offset;
      for (const entry of entries) {
        const nameBytes = new TextEncoder().encode(entry.name);
        const header = new Uint8Array(CENTRAL_HEADER_SIZE + nameBytes.length);
        const view = new DataView(header.buffer);
        view.setUint32(0, CENTRAL_HEADER, true);
        view.setUint16(4, VERSION, true);
        view.setUint16(6, VERSION, true);
        view.setUint16(8, UTF8_NAMES, true);
        view.setUint16(10, STORED, true);
        view.setUint32(16, entry.crc, true);
        view.setUint32(20, entry.size, true);
        view.setUint32(24, entry.size, true);
        view.setUint16(28, nameBytes.length, true);
        view.setUint32(42, entry.offset, true);
        header.set(nameBytes, CENTRAL_HEADER_SIZE);
        await write(header);
      }
      const end = new Uint8Array(END_SIZE);
      const view = new DataView(end.buffer);
      view.setUint32(0, END_OF_CENTRAL, true);
      view.setUint16(8, entries.length, true);
      view.setUint16(10, entries.length, true);
      view.setUint32(12, offset - start, true);
      view.setUint32(16, start, true);
      await write(end);
    },
  };
}

const viewOf = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

/** Reads exactly `length` bytes at `offset`, or refuses a file cut short. */
async function readExactly(source: ByteSource, offset: number, length: number) {
  const bytes = offset + length <= source.size ? await source.read(offset, length) : new Uint8Array();
  if (bytes.length !== length) throw new ZipError('The zip is cut short');
  return bytes;
}

/** Opens a zip: reads its list of entries, not yet their bytes. Refuses any zip it cannot read. */
export async function readZip(source: ByteSource) {
  // The end record is the last thing of the file, but for a comment.
  const tailLength = Math.min(source.size, END_SEARCH);
  const tail = await readExactly(source, source.size - tailLength, tailLength);
  let endAt = -1;
  for (let i = tail.length - END_SIZE; i >= 0; i--) {
    if (viewOf(tail).getUint32(i, true) === END_OF_CENTRAL) {
      endAt = i;
      break;
    }
  }
  if (endAt < 0) throw new ZipError('No zip');
  const end = viewOf(tail.subarray(endAt));
  const count = end.getUint16(10, true);
  const directory = await readExactly(source, end.getUint32(16, true), end.getUint32(12, true));
  const entries = new Map<string, Entry>();
  let at = 0;
  for (let i = 0; i < count; i++) {
    if (at + CENTRAL_HEADER_SIZE > directory.length) throw new ZipError('The zip is cut short');
    const view = viewOf(directory.subarray(at));
    if (view.getUint32(0, true) !== CENTRAL_HEADER) throw new ZipError('A damaged zip');
    if (view.getUint16(10, true) !== STORED) throw new ZipError('A compressed zip');
    const size = view.getUint32(24, true);
    if (view.getUint32(20, true) !== size) throw new ZipError('A compressed zip');
    const nameLength = view.getUint16(28, true);
    const skip = nameLength + view.getUint16(30, true) + view.getUint16(32, true);
    const name = new TextDecoder().decode(directory.subarray(at + CENTRAL_HEADER_SIZE, at + CENTRAL_HEADER_SIZE + nameLength));
    entries.set(name, { name, crc: view.getUint32(16, true), size, offset: view.getUint32(42, true) });
    at += CENTRAL_HEADER_SIZE + skip;
  }
  return {
    /** The names of its entries, in the zip's order. */
    names: (): string[] => [...entries.keys()],
    has: (name: string) => entries.has(name),
    /** The bytes of the entry `name`, checked against its CRC-32. */
    async read(name: string): Promise<Uint8Array> {
      const entry = entries.get(name);
      if (!entry) throw new ZipError(`No entry ${name}`);
      const header = viewOf(await readExactly(source, entry.offset, LOCAL_HEADER_SIZE));
      if (header.getUint32(0, true) !== LOCAL_HEADER) throw new ZipError('A damaged zip');
      const dataAt = entry.offset + LOCAL_HEADER_SIZE + header.getUint16(26, true) + header.getUint16(28, true);
      const data = await readExactly(source, dataAt, entry.size);
      if (crc32(data) !== entry.crc) throw new ZipError(`Entry ${name} is damaged`);
      return data;
    },
  };
}

export type Zip = Awaited<ReturnType<typeof readZip>>;
