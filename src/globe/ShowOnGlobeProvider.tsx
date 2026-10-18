// A Place another screen wants shown on the globe, e.g. from the location link of a Note.
// The globe screen stays mounted under the others, so it flies there as soon as it is asked,
// while the asking screen slides away.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PlaceRef } from '@/journal/journal';

type ShowOnGlobe = {
  /** The Place waiting to be shown, until the globe screen calls shown(). */
  pending: PlaceRef | null;
  show(place: PlaceRef): void;
  shown(): void;
};

const ShowOnGlobeContext = createContext<ShowOnGlobe | null>(null);

export function ShowOnGlobeProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PlaceRef | null>(null);
  const value = useMemo<ShowOnGlobe>(
    () => ({ pending, show: (place) => setPending({ ...place }), shown: () => setPending(null) }),
    [pending],
  );
  return <ShowOnGlobeContext.Provider value={value}>{children}</ShowOnGlobeContext.Provider>;
}

export function useShowOnGlobe(): ShowOnGlobe {
  const value = useContext(ShowOnGlobeContext);
  if (!value) throw new Error('useShowOnGlobe must be used inside a ShowOnGlobeProvider');
  return value;
}
