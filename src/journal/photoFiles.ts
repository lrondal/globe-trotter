// Where the Journal keeps its Photos' files: copies of the images the user picked, made in the
// app so they survive their deletion from the camera roll. On the phone it is the app's
// documents (devicePhotoFiles.ts); in the Node tests, files held in memory (memoryPhotoFiles.ts).
// The Journal keeps only the files' names: the phone moves the app's folder between updates.

/** The names of a Photo's two files: its copy, 2048 px on its long side, and its 256 px thumbnail. */
export type PhotoFileNames = { file: string; thumbnail: string };

export type PhotoFiles = {
  /** Copies the image at `source`, a URI the picker or the camera gave, into the app. */
  copy(source: string): Promise<PhotoFileNames>;
  /** Deletes files copy() or write() made; a name already gone is no error. */
  remove(names: readonly string[]): void;
  /** The names of every file held, in no set order: an Export's, and a reset's to remove. */
  list(): string[];
  /** The bytes of a file held, for an Export. */
  read(name: string): Promise<Uint8Array>;
  /** Writes a file of an Export under its name, over any file of that name. */
  write(name: string, bytes: Uint8Array): Promise<void>;
};
