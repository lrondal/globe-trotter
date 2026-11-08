// The Photos' files on the phone, in the app's documents, which the system never clears:
// each image picked or taken is copied there as a JPEG 2048 px on its long side, with a
// 256 px thumbnail for the globe and the grids. Smaller images are not enlarged.
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import type { PhotoFiles } from './photoFiles';

const PHOTOS = new Directory(Paths.document, 'photos');
const FILE_SIDE = 2048;
const THUMBNAIL_SIDE = 256;
const QUALITY = 0.85;

/** The URI of a file of the Photos, by the name the Journal keeps. */
export function photoUri(name: string): string {
  return new File(PHOTOS, name).uri;
}

/** `image` reduced to `side` on its long side, saved as a JPEG named `name` among the Photos. */
async function saveReduced(image: ImageRef, side: number, name: string) {
  const scale = Math.min(1, side / Math.max(image.width, image.height));
  const reduced = await ImageManipulator.manipulate(image)
    .resize({ width: Math.round(image.width * scale), height: Math.round(image.height * scale) })
    .renderAsync();
  const saved = await reduced.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY });
  // Saved in the cache, which the system may clear: moved to the documents.
  await new File(saved.uri).move(new File(PHOTOS, name));
}

export function devicePhotoFiles(): PhotoFiles {
  return {
    async copy(source) {
      PHOTOS.create({ idempotent: true, intermediates: true });
      const image = await ImageManipulator.manipulate(source).renderAsync();
      // Unique without a counter to keep: the time, and a random tail for a burst of several.
      const stem = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const names = { file: `${stem}.jpg`, thumbnail: `${stem}.thumb.jpg` };
      await saveReduced(image, FILE_SIDE, names.file);
      await saveReduced(image, THUMBNAIL_SIDE, names.thumbnail);
      return names;
    },
    remove(names) {
      for (const name of names) {
        const file = new File(PHOTOS, name);
        if (file.exists) file.delete();
      }
    },
    list() {
      if (!PHOTOS.exists) return [];
      return PHOTOS.list().flatMap((entry) => (entry instanceof File ? [entry.name] : []));
    },
    read: (name) => new File(PHOTOS, name).bytes(),
    async write(name, bytes) {
      PHOTOS.create({ idempotent: true, intermediates: true });
      // Created, or written over.
      await new File(PHOTOS, name).write(bytes);
    },
  };
}
