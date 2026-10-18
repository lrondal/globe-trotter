import { Redirect, useLocalSearchParams } from 'expo-router';

import { countries, countryGeometry, footprintOf, places } from '@/atlas';
import { NoteScreen } from '@/note/NoteScreen';

/** The Note of the Country or Island `level`/`id`. */
export default function NoteRoute() {
  const { level, id } = useLocalSearchParams<{ level: string; id: string }>();
  const index = places.findIndex((place) => place.level === level && place.id === id);
  if (index < 0) return <Redirect href="/" />;

  const { name, countryId } = countries[index];
  const { lon, lat } = footprintOf(countryGeometry, index);
  const country = countryId ? countries.find((c) => c.id === countryId && !c.countryId)?.name : undefined;
  return <NoteScreen key={`${level}:${id}`} place={places[index]} name={name} country={country} lon={lon} lat={lat} />;
}
