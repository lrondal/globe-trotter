// The Journal for the screens: opened once from the phone's database, and re-rendering
// its readers after every change.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { containerOf, countryOf, placeIdsAt, places } from '@/atlas';
import { applyExport, resetAll, writeExport, type ExportContents } from '@/export/archive';
import type { ByteSink } from '@/export/bytes';
import type { Preferences } from '@/profile/preferences';

import { deviceDatabase } from './deviceDatabase';
import { devicePhotoFiles } from './devicePhotoFiles';
import { openJournal, type City, type Journal, type Mark, type Photo, type PlaceRef, type Point } from './journal';

type JournalState = {
  /** Read-only here: write through the functions below, so the screens re-render. */
  journal: Journal;
  /** Goes up with every change: a dependency for whatever is derived from the Journal. */
  version: number;
  /** A City given whole enters the Journal with its Mark (see Journal.mark). */
  mark(place: PlaceRef | City, mark: Mark | null): void;
  /** Marks a Place Wish unless it has a Mark; returns the Mark it had (see Journal.wish). */
  wish(place: PlaceRef | City): Mark | null;
  /** Takes back the last change of Mark (see Journal.undo). */
  undo(): void;
  /** Of a Place marked Visited, YYYY-MM (see Journal.setVisitDate). */
  setVisitDate(place: PlaceRef, visitDate: string): void;
  /** Of a Plan, YYYY-MM, or null for « Un jour » (see Journal.setPlannedDate). */
  setPlannedDate(countryId: string, plannedDate: string | null): void;
  /** Moves a stop of an Itinerary to `to`, an index in it (see Journal.moveStop). */
  moveStop(place: PlaceRef, to: number): void;
  /** Reorders some Plans among the places they held (see Journal.orderPlans). */
  orderPlans(countryIds: readonly string[]): void;
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
  /** Resolves once the images are copied into the app (see Journal.addPhotos). */
  addPhotos(place: PlaceRef | City, sources: readonly string[]): Promise<Photo[]>;
  deletePhoto(id: number): void;
  setCaption(id: number, caption: string): void;
  setCoverPhoto(place: PlaceRef, photoId: number): void;
  /** « Effacer » a Country, an Island or a Region, for good (see Journal.clear). */
  clear(place: PlaceRef): void;
  /** « Supprimer » a City of the Journal, for good (see Journal.deleteCity). */
  deleteCity(id: string): void;
  /** Writes an Export of the Journal, its Photos' files and `preferences` to `sink`. */
  writeExport(sink: ByteSink, preferences: Preferences): Promise<void>;
  /** Replaces the Journal and its Photos' files with an Export's (see export/archive.ts). */
  applyExport(contents: ExportContents): Promise<void>;
  /** Empties the Journal and removes every Photo file, for good. */
  resetAll(): void;
};

const JournalContext = createContext<JournalState | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [files] = useState(devicePhotoFiles);
  const [journal] = useState(() => openJournal({
      db: deviceDatabase(),
      atlas: { places, containerOf, locate: placeIdsAt, countryOf },
      files,
    }));
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
      wish(place) {
        const had = journal.wish(place);
        if (had === null) changed();
        return had;
      },
      undo() {
        if (journal.undo()) changed();
      },
      setVisitDate: writing(journal.setVisitDate),
      setPlannedDate: writing(journal.setPlannedDate),
      moveStop: writing(journal.moveStop),
      orderPlans: writing(journal.orderPlans),
      writeNote: writing(journal.writeNote),
      addTodo: writing(journal.addTodo),
      checkTodo: writing(journal.checkTodo),
      moveTodo: writing(journal.moveTodo),
      deleteTodo: writing(journal.deleteTodo),
      createCity: writingAfter(journal.createCity),
      renameCity: writing(journal.renameCity),
      moveCity: writingAfter(journal.moveCity),
      addPhotos: writingAfter(journal.addPhotos),
      deletePhoto: writing(journal.deletePhoto),
      setCaption: writing(journal.setCaption),
      setCoverPhoto: writing(journal.setCoverPhoto),
      clear: writing(journal.clear),
      deleteCity: writing(journal.deleteCity),
      writeExport: (sink, preferences) => writeExport({ journal, files, preferences }, sink),
      async applyExport(contents) {
        try {
          await applyExport(contents, { journal, files });
        } finally {
          // Even half done, files may have changed: the readers read anew.
          changed();
        }
      },
      resetAll() {
        resetAll({ journal, files });
        changed();
      },
    };
  }, [journal, files, version]);

  return <JournalContext.Provider value={state}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalState {
  const state = useContext(JournalContext);
  if (!state) throw new Error('useJournal must be used inside a JournalProvider');
  return state;
}
