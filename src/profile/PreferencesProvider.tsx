// The Profile's settings for the screens: read from the phone at launch, before the globe
// draws, and kept there at each change.
import { Storage } from 'expo-sqlite/kv-store';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { readPreferences, writePreference, type KeyValueStore, type Preferences } from './preferences';

/** expo-sqlite's key-value Storage, read and written synchronously. */
const phoneStore: KeyValueStore = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
};

type PreferencesState = Preferences & {
  set(key: keyof Preferences, value: boolean): void;
};

const PreferencesContext = createContext<PreferencesState | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => readPreferences(phoneStore));
  const state = useMemo<PreferencesState>(
    () => ({
      ...preferences,
      set(key, value) {
        writePreference(phoneStore, key, value);
        setPreferences((current) => ({ ...current, [key]: value }));
      },
    }),
    [preferences],
  );
  return <PreferencesContext.Provider value={state}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesState {
  const state = useContext(PreferencesContext);
  if (!state) throw new Error('usePreferences must be used inside a PreferencesProvider');
  return state;
}
