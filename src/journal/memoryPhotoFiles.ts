// Photo files held in memory, for the Node tests: what the app's documents would hold. A copy's
// bytes are those of its source's URI.
import type { PhotoFiles } from './photoFiles.ts';

export function memoryPhotoFiles(): PhotoFiles & {
  /** The names of the files held, in no set order. */
  held(): string[];
} {
  const held = new Map<string, Uint8Array>();
  let copies = 0;
  return {
    async copy(source) {
      const name = `${++copies}-${source.split('/').pop()}`;
      const names = { file: `${name}.jpg`, thumbnail: `${name}.thumb.jpg` };
      held.set(names.file, new TextEncoder().encode(source));
      held.set(names.thumbnail, new TextEncoder().encode(`thumbnail of ${source}`));
      return names;
    },
    remove(names) {
      for (const name of names) held.delete(name);
    },
    list: () => [...held.keys()],
    async read(name) {
      const bytes = held.get(name);
      if (!bytes) throw new Error(`No file ${name}`);
      return bytes.slice();
    },
    async write(name, bytes) {
      held.set(name, bytes.slice());
    },
    held: () => [...held.keys()],
  };
}
