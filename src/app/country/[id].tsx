import { Redirect, useLocalSearchParams } from 'expo-router';

import { places } from '@/atlas';
import { CountryScreen } from '@/country/CountryScreen';
import type { PlaceRef } from '@/journal/journal';

/** The Place of the Country's page to scroll to, from the route's `level` and `place`. */
function focusOf(level: string | undefined, id: string | undefined): PlaceRef | undefined {
  if (!id) return undefined;
  if (level === 'island' || level === 'region' || level === 'city') return { level, id };
  return undefined;
}

/** The page of the Country `id`, from the Journal; scrolled to the Place `level`/`place` if given. */
export default function CountryRoute() {
  const { id, level, place } = useLocalSearchParams<{ id: string; level?: string; place?: string }>();
  if (!places.some((country) => country.level === 'country' && country.id === id)) return <Redirect href="/" />;
  return <CountryScreen key={id} countryId={id} focus={focusOf(level, place)} />;
}
