// What the globe shows at launch and what the recentre button does, from what the device
// says about the user's position. Pure logic: the position is only ever passed in, never kept.
import { clampLat, type Point, type View } from '../globe/camera.ts';

/** Where the globe opens when the position is unknown. */
export const DEFAULT_CENTER: Point = { lon: 10, lat: 45 };

/** The whole globe, centred on the last known position, or on Europe without one. */
export function launchView(lastKnown: Point | null): View {
  const { lon, lat } = lastKnown ?? DEFAULT_CENTER;
  return { lon, lat: clampLat(lat), zoom: 1 };
}

/** What the system says about the location permission, as expo-location reports it. */
export type Permission = { granted: boolean; canAskAgain: boolean };

/**
 * What the recentre button does: fly to the position, fetch a position first, ask for the
 * permission, or explain how to turn location on in Settings.
 */
export type RecenterAction = 'fly' | 'locate' | 'ask' | 'explain';

export function recenterAction(position: Point | null, permission: Permission): RecenterAction {
  if (position) return 'fly';
  if (permission.granted) return 'locate';
  return permission.canAskAgain ? 'ask' : 'explain';
}
