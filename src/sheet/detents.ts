// The heights the Place sheet rests at, as points of sheet showing above the bottom of the
// Globe screen. Worklets, so the Globe can open the sheet from the tap gesture.

export type Detent = 'peek' | 'half' | 'full';

/** Globe left visible above the sheet when it is full height. */
const FULL_GAP = 56;

export function detentHeight(detent: Detent, screenHeight: number) {
  'worklet';
  if (detent === 'peek') return 0.28 * screenHeight;
  if (detent === 'half') return 0.52 * screenHeight;
  return screenHeight - FULL_GAP;
}

/** How far ahead a released sheet is projected, in seconds of its release speed. */
const FLING = 0.12;

/**
 * Where a sheet released at `height` points, moving up at `velocity` points per second,
 * comes to rest: the nearest detent to where its momentum carries it, or null (closed) when
 * pulled well below the peek height.
 */
export function restingDetent(height: number, velocity: number, screenHeight: number): Detent | null {
  'worklet';
  const projected = height + velocity * FLING;
  if (projected < detentHeight('peek', screenHeight) / 2) return null;
  const detents: Detent[] = ['peek', 'half', 'full'];
  let nearest: Detent = 'peek';
  for (const detent of detents) {
    const distance = Math.abs(detentHeight(detent, screenHeight) - projected);
    if (distance < Math.abs(detentHeight(nearest, screenHeight) - projected)) nearest = detent;
  }
  return nearest;
}
