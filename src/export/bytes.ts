// The bytes of a file an Export is written to or read from, a piece at a time: an Export holds
// every Photo, more than the phone should hold in memory at once. On the phone, a file of
// expo-file-system (deviceBytes.ts); in the Node tests, an array in memory (memoryBytes.ts).

/** Where a file is written, from its start, in order. */
export type ByteSink = {
  write(bytes: Uint8Array): Promise<void>;
};

/** A file read anywhere in it. */
export type ByteSource = {
  /** Its length, in bytes. */
  size: number;
  /** The `length` bytes from `offset`; fewer at its end. */
  read(offset: number, length: number): Promise<Uint8Array>;
};
