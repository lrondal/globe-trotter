// The name of a Place, as the screens show it: a City's from the Journal, the others' from the Atlas.
import { atlas, countries, placeIndex } from '@/atlas';

import type { Journal, PlaceRef } from './journal';

/** Empty for a Place neither the Journal nor the Atlas knows. */
export function placeName(journal: Journal, place: PlaceRef): string {
  if (place.level === 'city') return journal.city(place.id)?.name ?? '';
  if (place.level === 'region') return atlas.region(place.id)?.name ?? '';
  return countries[placeIndex(place.id)]?.name ?? '';
}
