// Photo files held as names in memory, for the Node tests: what the app's documents would hold.
import type { PhotoFiles } from './photoFiles.ts';

export function memoryPhotoFiles(): PhotoFiles & {
  /** The names of the files held, in no set order. */
  held(): string[];
} {
  const held = new Set<string>();
  let copies = 0;
  return {
    async copy(source) {
      const name = `${++copies}-${source.split('/').pop()}`;
      const names = { file: `${name}.jpg`, thumbnail: `${name}.thumb.jpg` };
      held.add(names.file);
      held.add(names.thumbnail);
      return names;
    },
    remove(names) {
      for (const name of names) held.delete(name);
    },
    held: () => [...held],
  };
}
