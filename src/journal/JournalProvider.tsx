// The Journal for the screens: opened once from the phone's database, and re-rendering
// its readers after every change.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { places } from '@/atlas';

import { deviceDatabase } from './deviceDatabase';
import { openJournal, type Journal, type Mark, type PlaceRef } from './journal';

type JournalState = {
  /** Read-only here: write through mark and undo, so the screens re-render. */
  journal: Journal;
  /** Goes up with every change: a dependency for whatever is derived from the Journal. */
  version: number;
  mark(place: PlaceRef, mark: Mark | null): void;
  /** Takes back the last change of Mark (see Journal.undo). */
  undo(): void;
};

const JournalContext = createContext<JournalState | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [journal] = useState(() => openJournal({ db: deviceDatabase(), atlas: { places } }));
  const [version, setVersion] = useState(0);

  // A new value after each change, so every reader re-renders.
  const state = useMemo<JournalState>(
    () => ({
      journal,
      version,
      mark(place, mark) {
        journal.mark(place, mark);
        setVersion((v) => v + 1);
      },
      undo() {
        if (journal.undo()) setVersion((v) => v + 1);
      },
    }),
    [journal, version],
  );

  return <JournalContext.Provider value={state}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalState {
  const state = useContext(JournalContext);
  if (!state) throw new Error('useJournal must be used inside a JournalProvider');
  return state;
}
