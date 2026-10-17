// The user's approximate position, held in memory only: it is never stored nor exported
// (#16). The launch view is resolved before the splash screen hides, so the globe opens
// already centred and never jumps afterwards; later positions only move the location dot.
import * as Location from 'expo-location';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { Point, View } from '@/globe/camera';

import { launchView, type Permission } from './launch';

/** The splash screen waits at most this long for the last known position, in milliseconds. */
const LAST_KNOWN_WAIT = 400;

type LocationState = {
  /** Where the globe opens; null until resolved. */
  launch: View | null;
  position: Point | null;
  permission: Permission;
  /** Shows the system prompt; resolves with the new permission. */
  request(): Promise<Permission>;
  /** Fetches a fresh approximate position; null when the device cannot give one. */
  locate(): Promise<Point | null>;
};

const LocationContext = createContext<LocationState | null>(null);

const toPoint = (location: Location.LocationObject | null): Point | null =>
  location && { lon: location.coords.longitude, lat: location.coords.latitude };

const toPermission = ({ granted, canAskAgain }: Location.LocationPermissionResponse): Permission => ({
  granted,
  canAskAgain,
});

function lastKnown(): Promise<Point | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), LAST_KNOWN_WAIT));
  const last = Location.getLastKnownPositionAsync().then(toPoint, () => null);
  return Promise.race([last, timeout]);
}

async function current(): Promise<Point | null> {
  try {
    return toPoint(await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  } catch {
    // Location services off, or no fix.
    return null;
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [launch, setLaunch] = useState<View | null>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const [permission, setPermission] = useState<Permission>({ granted: false, canAskAgain: true });

  const locate = useCallback(async () => {
    const point = await current();
    if (point) setPosition(point);
    return point;
  }, []);

  const request = useCallback(async () => {
    const next = toPermission(await Location.requestForegroundPermissionsAsync());
    setPermission(next);
    if (next.granted) locate();
    return next;
  }, [locate]);

  // Launch: centre on the last known position, then ask for the permission on first launch.
  useEffect(() => {
    let alive = true;
    (async () => {
      const response = await Location.getForegroundPermissionsAsync().catch(() => null);
      const last = response?.granted ? await lastKnown() : null;
      if (!alive) return;
      setLaunch(launchView(last));
      setPosition(last);
      if (!response) return;
      setPermission(toPermission(response));
      if (response.granted) locate();
      else if (response.status === Location.PermissionStatus.UNDETERMINED) request();
    })();
    return () => {
      alive = false;
    };
  }, [locate, request]);

  // Back from the background: the view stays as it was; only the permission and dot refresh,
  // as location may have been turned on or off in Settings meanwhile.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const next = toPermission(await Location.getForegroundPermissionsAsync());
      setPermission(next);
      if (next.granted) locate();
      else setPosition(null);
    });
    return () => subscription.remove();
  }, [locate]);

  return (
    <LocationContext.Provider value={{ launch, position, permission, request, locate }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationState {
  const state = useContext(LocationContext);
  if (!state) throw new Error('useLocation must be used inside a LocationProvider');
  return state;
}
