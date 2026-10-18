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
    /** The Journal's own write, followed by a re-render of its readers. */
    const writing =
      <Args extends unknown[]>(write: (...args: Args) => unknown) =>
      (...args: Args) => {
        write(...args);
        changed();
      };
    return {
      journal,
      version,
      mark: writing(journal.mark),
      undo() {
        if (journal.undo()) changed();
      },
      writeNote: writing(journal.writeNote),
      addTodo: writing(journal.addTodo),
      checkTodo: writing(journal.checkTodo),
      moveTodo: writing(journal.moveTodo),
      deleteTodo: writing(journal.deleteTodo),
    };
  }, [journal, version]);

  return <JournalContext.Provider value={state}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalState {
  const state = useContext(JournalContext);
  if (!state) throw new Error('useJournal must be used inside a JournalProvider');
  return state;
}
