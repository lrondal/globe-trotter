import { Redirect, useLocalSearchParams } from 'expo-router';

import { places } from '@/atlas';
import { CountryScreen } from '@/country/CountryScreen';
import type { PlaceRef } from '@/journal/journal';

const LEVELS: readonly string[] = ['island', 'region', 'city'] satisfies PlaceRef['level'][];

/** The page of the Country `id`, from the Journal; scrolled to the Place `level`/`place` if given. */
export default function CountryRoute() {
  const { id, level, place } = useLocalSearchParams<{ id: string; level?: string; place?: string }>();
  if (!places.some((p) => p.level === 'country' && p.id === id)) return <Redirect href="/" />;
  const focus = level && place && LEVELS.includes(level) ? ({ level, id: place } as PlaceRef) : undefined;
  return <CountryScreen key={id} countryId={id} focus={focus} />;
}
