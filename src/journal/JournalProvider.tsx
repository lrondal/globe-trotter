// The Journal for the screens: opened once from the phone's database, and re-rendering
// its readers after every change.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { containerOf, placeIdsAt, places } from '@/atlas';

import { deviceDatabase } from './deviceDatabase';
import { openJournal, type City, type Journal, type Mark, type PlaceRef, type Point } from './journal';

type JournalState = {
  /** Read-only here: write through the functions below, so the screens re-render. */
  journal: Journal;
  /** Goes up with every change: a dependency for whatever is derived from the Journal. */
  version: number;
  /** A City given whole enters the Journal with its Mark (see Journal.mark). */
  mark(place: PlaceRef | City, mark: Mark | null): void;
  /** Takes back the last change of Mark (see Journal.undo). */
  undo(): void;
  writeNote(place: PlaceRef | City, note: string): void;
  addTodo(place: PlaceRef | City, text: string): void;
  checkTodo(id: number, done: boolean): void;
  moveTodo(id: number, to: number): void;
  deleteTodo(id: number): void;
  /** Resolves with the Custom City created, or null at sea (see Journal.createCity). */
  createCity(name: string, point: Point): Promise<City | null>;
  renameCity(id: string, name: string): void;
  /** Resolves with whether the Custom City moved: not at sea (see Journal.moveCity). */
  moveCity(id: string, point: Point): Promise<boolean>;
};

const JournalContext = createContext<JournalState | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [journal] = useState(() => openJournal({ db: deviceDatabase(), atlas: { places, containerOf, locate: placeIdsAt } }));
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
    /** Likewise for a write that waits on the Atlas, and may make no change. */
    const writingAfter =
      <Args extends unknown[], Result>(write: (...args: Args) => Promise<Result>) =>
      async (...args: Args) => {
        const result = await write(...args);
        if (result) changed();
        return result;
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
      createCity: writingAfter(journal.createCity),
      renameCity: writing(journal.renameCity),
      moveCity: writingAfter(journal.moveCity),
    };
  }, [journal, version]);

  return <JournalContext.Provider value={state}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalState {
  const state = useContext(JournalContext);
  if (!state) throw new Error('useJournal must be used inside a JournalProvider');
  return state;
}
