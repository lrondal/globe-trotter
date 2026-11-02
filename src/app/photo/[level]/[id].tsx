import { Redirect, useLocalSearchParams } from 'expo-router';

import type { PlaceRef } from '@/journal/journal';
import { PhotoViewer } from '@/photos/PhotoViewer';

const LEVELS: readonly string[] = ['country', 'island', 'region', 'city'];

/**
 * A Photo of the Place `level`/`id` full screen, among its own Photos, or with `inside` among
 * those of the Places inside it.
 */
export default function PhotoRoute() {
  const { level, id, photo, inside } = useLocalSearchParams<{ level: string; id: string; photo: string; inside?: string }>();
  if (!LEVELS.includes(level)) return <Redirect href="/" />;
  return <PhotoViewer place={{ level: level as PlaceRef['level'], id }} first={Number(photo)} inside={inside === '1'} />;
}
