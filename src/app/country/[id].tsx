import { Redirect, useLocalSearchParams } from 'expo-router';

import { places } from '@/atlas';
import { CountryScreen } from '@/country/CountryScreen';

/** The page of the Country `id`, from the Journal. */
export default function CountryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!places.some((place) => place.level === 'country' && place.id === id)) return <Redirect href="/" />;
  return <CountryScreen key={id} countryId={id} />;
}
