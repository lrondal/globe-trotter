// A file's bytes held in memory, for the Node tests.
import type { ByteSink, ByteSource } from './bytes.ts';

/**
 * A file in memory, holding `initial` to begin with: its sink appends to it, and source() reads
 * it as written so far, as an Export just made, or one picked to import.
 */
export function memoryBytes(initial: Uint8Array = new Uint8Array()) {
  const chunks: Uint8Array[] = [initial];
  /** Every byte written so far, as one array. */
  const all = () => {
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const chunk of chunks) {
      out.set(chunk, at);
      at += chunk.length;
    }
    return out;
  };
  const sink: ByteSink = {
    async write(bytes) {
      chunks.push(bytes.slice());
    },
  };
  /** The file as written so far, to read. */
  const source = (): ByteSource => {
    const bytes = all();
    return { size: bytes.length, read: async (offset, length) => bytes.slice(offset, offset + length) };
  };
  return { sink, source, all };
}
