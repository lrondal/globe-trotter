// Picking a Place in « Rechercher un lieu » to visit: it is marked Wish, unless it has a Mark
// of its own (see Journal.wish), and a notice says what came of it, with « Annuler » when it
// was marked. Shared by the Wishlist and a Country's page.
import { useCallback, useState } from 'react';

import { cityPlace } from '@/atlas';
import type { City, PlaceRef } from '@/journal/journal';
import { useJournal } from '@/journal/JournalProvider';
import { wishNotice } from '@/journal/view';

import type { Picked } from './SearchBar';

export type WishNotice = { key: number; message: string; undoable: boolean };

export function useWishPick() {
  const { journal, wish } = useJournal();
  const [notice, setNotice] = useState<WishNotice | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  const pick = (picked: Picked) => {
    // A City already in the Journal, a Custom City say, is wished as it is there.
    const place: PlaceRef | City =
      picked.level === 'city'
        ? (journal.city(picked.place.id) ?? cityPlace(picked.place))
        : { level: picked.level, id: picked.place.id };
    setNotice({ key: Date.now(), ...wishNotice(picked.place.name, wish(place)) });
  };

  return { pick, notice, hideNotice };
}
