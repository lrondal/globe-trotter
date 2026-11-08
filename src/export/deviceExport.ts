// An Export on the phone: written to the app's cache and handed to the iOS share sheet, and
// one picked among the user's files to import. Its bytes go through a FileHandle, a piece at a
// time, never the whole archive in memory.
import { File, FileMode, Paths, type FileHandle } from 'expo-file-system';
import { Share } from 'react-native';

import type { ByteSink, ByteSource } from './bytes';
import { InvalidExport, readExport, type ExportContents } from './archive';

const EXPORT_PREFIX = 'globe-trotter-';

/** A file written from its start through `handle`. */
const sinkOf = (handle: FileHandle): ByteSink => ({
  write: (bytes) => handle.writeBytes(bytes),
});

/** A file read anywhere through `handle`. */
const sourceOf = (handle: FileHandle): ByteSource => ({
  size: handle.size ?? 0,
  async read(offset, length) {
    handle.offset = offset;
    return handle.readBytes(length);
  },
});

/**
 * Writes an Export with `write` into a new file of the cache, named by the day, and offers it to
 * the share sheet: to save in Files, send by AirDrop or mail. An earlier Export left in the cache
 * is deleted first. Resolves once the sheet is dismissed.
 */
export async function shareExport(write: (sink: ByteSink) => Promise<void>, today = new Date()) {
  for (const entry of Paths.cache.list()) {
    if (entry instanceof File && entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
  }
  const day = today.toISOString().slice(0, 10);
  const file = new File(Paths.cache, `${EXPORT_PREFIX}${day}.zip`);
  file.create({ overwrite: true });
  try {
    const handle = file.open(FileMode.ReadWrite);
    try {
      await write(sinkOf(handle));
    } finally {
      handle.close();
    }
  } catch (error) {
    // Half an Export is none: not left to be shared.
    if (file.exists) file.delete();
    throw error;
  }
  await Share.share({ url: file.uri, title: 'Mes voyages' });
}

/** An Export picked and checked, open until its import is applied or given up. */
export type PickedExport = { contents: ExportContents; close(): void };

/**
 * Opens the system's file picker for a zip, and reads and checks the Export picked whole (see
 * readExport). Null when the user cancels; rejects with an InvalidExport for a file that is
 * none, or cannot be read.
 */
export async function pickExport(): Promise<PickedExport | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/zip'] });
  if (picked.canceled) return null;
  let handle: FileHandle;
  try {
    handle = picked.result.open(FileMode.ReadOnly);
  } catch {
    throw new InvalidExport('Ce fichier ne peut pas être ouvert.');
  }
  try {
    const contents = await readExport(sourceOf(handle));
    return { contents, close: () => handle.close() };
  } catch (error) {
    handle.close();
    throw error;
  }
}
