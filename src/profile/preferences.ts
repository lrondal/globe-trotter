// The user's settings of the Profile, kept on the phone apart from the Journal: they are not
// Places. An Export carries them, an Import sets them, and a reset sets them back to their
// defaults. Read once at launch, written at each change.

export type Preferences = {
  /** « Photos sur le globe »: the Photo thumbnails are drawn over their Places. */
  photosOnGlobe: boolean;
  /** « Rotation automatique »: the globe turns slowly on its own while left alone. */
  autoRotate: boolean;
};

/** Where the Preferences are kept: on the phone, expo-sqlite's key-value Storage. */
export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Before the user changes anything: the Photos show, and the globe stays still. */
export const DEFAULT_PREFERENCES: Readonly<Preferences> = { photosOnGlobe: true, autoRotate: false };

const KEYS = Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[];

/** The Preferences kept in `store`; any never set, or unreadable, is its default. */
export function readPreferences(store: KeyValueStore): Preferences {
  const read = { ...DEFAULT_PREFERENCES };
  for (const key of KEYS) {
    const value = store.getItem(key);
    if (value === 'true' || value === 'false') read[key] = value === 'true';
  }
  return read;
}

export function writePreference(store: KeyValueStore, key: keyof Preferences, value: boolean) {
  store.setItem(key, String(value));
}

/** Writes them all: those of an Import, or the defaults after a reset. */
export function writePreferences(store: KeyValueStore, preferences: Preferences) {
  for (const key of KEYS) writePreference(store, key, preferences[key]);
}
