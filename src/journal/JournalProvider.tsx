// The Journal for the screens: opened once from the phone's database, and re-rendering
// its readers after every change.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { places } from '@/atlas';

import { deviceDatabase } from './deviceDatabase';
import { openJournal, type Journal, type Mark, type PlaceRef } from './journal';

type JournalState = {
  /** Read-only here: write through the functions below, so the screens re-render. */
  journal: Journal;
  /** Goes up with every change: a dependency for whatever is derived from the Journal. */
  version: number;
  mark(place: PlaceRef, mark: Mark | null): void;
  /** Takes back the last change of Mark (see Journal.undo). */
  undo(): void;
  writeNote(place: PlaceRef, note: string): void;
  addTodo(place: PlaceRef, text: string): void;
  checkTodo(id: number, done: boolean): void;
  moveTodo(id: number, to: number): void;
  deleteTodo(id: number): void;
};

const JournalContext = createContext<JournalState | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [journal] = useState(() => openJournal({ db: deviceDatabase(), atlas: { places } }));
  const [version, setVersion] = useState(0);

  // A new value after each change, so every reader re-renders.
  const state = useMemo<JournalState>(() => {
    const changed = () => setVersion((v) => v + 1);
    return {
      journal,
      version,
      mark(place, mark) {
        journal.mark(place, mark);
        changed();
      },
      undo() {
        if (journal.undo()) changed();
      },
      writeNote(place, note) {
        journal.writeNote(place, note);
        changed();
      },
      addTodo(place, text) {
        journal.addTodo(place, text);
        changed();
      },
      checkTodo(id, done) {
        journal.checkTodo(id, done);
        changed();
      },
      moveTodo(id, to) {
        journal.moveTodo(id, to);
        changed();
      },
      deleteTodo(id) {
        journal.deleteTodo(id);
        changed();
      },
    };
  }, [journal, version]);

  return <JournalContext.Provider value={state}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalState {
  const state = useContext(JournalContext);
  if (!state) throw new Error('useJournal must be used inside a JournalProvider');
  return state;
}
