// Where a row dragged up or down a list lands, for reordering the Todos by hand.

/**
 * The index the dragged row takes once dropped: the number of other rows whose middle is above
 * its own. `heights` are the rows' heights in their current order, `from` is the dragged row's
 * index there, and `top` is where its top edge is now, from the top of the list.
 */
export function dropIndex(heights: readonly number[], from: number, top: number): number {
  'worklet';
  const middle = top + heights[from] / 2;
  let y = 0;
  let index = 0;
  for (let i = 0; i < heights.length; i++) {
    if (i === from) continue;
    if (y + heights[i] / 2 < middle) index++;
    y += heights[i];
  }
  return index;
}

/** `list` with the item at `from` moved to `to`. */
export function moved<T>(list: readonly T[], from: number, to: number): T[] {
  'worklet';
  const next = list.filter((_, i) => i !== from);
  next.splice(to, 0, list[from]);
  return next;
}
