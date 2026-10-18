// The colour layers of the globe: each Country is filled by the layer its Status and the
// filter chips put it in. Hiding Visited or Wish turns those Countries back to plain land;
// hiding Unexplored leaves only their outlines on the sea.
import type { Status } from '../journal/journal.ts';

/** Index of each layer's path, as traceCountries expects them. */
export const LAYER = { land: 0, visited: 1, wish: 2, outline: 3 } as const;
export type Layer = (typeof LAYER)[keyof typeof LAYER];

/** Which Statuses the filter chips show. */
export type Filters = Record<Status, boolean>;

export function layerOf(status: Status, filters: Filters): Layer {
  if (status === 'unexplored') return filters.unexplored ? LAYER.land : LAYER.outline;
  return filters[status] ? LAYER[status] : LAYER.land;
}
