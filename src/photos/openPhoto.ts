import { router } from 'expo-router';

import type { Photo, PlaceRef } from '@/journal/journal';

/**
 * Opens a Photo full screen, among the Photos it is shown with in `place`: its own, or those
 * of the Places inside it, a Kyoto Photo in Japan's say.
 */
export function openPhoto(place: PlaceRef, photo: Photo) {
  const inside = photo.place.level !== place.level || photo.place.id !== place.id;
  router.push({
    pathname: '/photo/[level]/[id]',
    params: { level: place.level, id: place.id, photo: String(photo.id), inside: inside ? '1' : '0' },
  });
}
