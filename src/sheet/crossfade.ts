// How the Place sheet goes from one Place to the next: a Region tapped in the selected
// Country, or another Region of it, fades in over it, the sheet staying at its height (#42).

import type { PlaceRef } from '../journal/journal.ts';

/** Which Place a sheet shows, to tell how the next one replaces it. */
export type SheetIdentity = {
  ref: PlaceRef;
  /** Index in the Atlas of its Country. */
  country: number;
};

/**
 * - fade: the content fades out and the Region fades in, the sheet not moving;
 * - swap: the new Place shows at once, as the sheet opens or slides to half height;
 * - update: the same Place, marked or renamed, changes in place;
 * - keep: the sheet closes, still showing its last Place.
 */
export type SheetChange = 'fade' | 'swap' | 'update' | 'keep';

/** How the sheet goes from showing `before` to `after`; null is the sheet closed. */
export function sheetChange(before: SheetIdentity | null, after: SheetIdentity | null): SheetChange {
  if (!after) return 'keep';
  if (before && before.ref.level === after.ref.level && before.ref.id === after.ref.id) return 'update';
  // Only a Region tap leaves the sheet where it is: anything else selects, and slides it.
  if (before?.country === after.country && after.ref.level === 'region') return 'fade';
  return 'swap';
}
