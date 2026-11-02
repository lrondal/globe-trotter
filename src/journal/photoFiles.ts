// Where the Journal keeps its Photos' files: copies of the images the user picked, made in the
// app so they survive their deletion from the camera roll. On the phone it is the app's
// documents (devicePhotoFiles.ts); in the Node tests, a set of names in memory (memoryPhotoFiles.ts).
// The Journal keeps only the files' names: the phone moves the app's folder between updates.

/** The names of a Photo's two files: its copy, 2048 px on its long side, and its 256 px thumbnail. */
export type PhotoFileNames = { file: string; thumbnail: string };

export type PhotoFiles = {
  /** Copies the image at `source`, a URI the picker or the camera gave, into the app. */
  copy(source: string): Promise<PhotoFileNames>;
  /** Deletes files copy() made; a name already gone is no error. */
  remove(names: readonly string[]): void;
};
