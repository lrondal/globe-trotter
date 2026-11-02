// How the Place sheet goes from one Place to the next: a Region tapped in the selected
// Country, or another Region of it, fades in over it at the sheet's height (#42).

/** What the sheet needs to know of a Place to tell how it replaces another. */
export type Shown = {
  /** The Place's level and id. */
  id: string;
  /** Index in the Atlas of its Country. */
  country: number;
};

/**
 * - fade: the content fades out and the new Place fades in;
 * - swap: the new Place shows at once, the sheet opening or sliding to another Country;
 * - update: the same Place, marked or renamed, changes in place;
 * - keep: the sheet closes, still showing its last Place.
 */
export type SheetChange = 'fade' | 'swap' | 'update' | 'keep';

/** How the sheet goes from showing `before` to `after`; null is the sheet closed. */
export function sheetChange(before: Shown | null, after: Shown | null): SheetChange {
  if (!after) return 'keep';
  if (!before || before.country !== after.country) return 'swap';
  if (before.id === after.id) return 'update';
  return 'fade';
}
