import { Redirect, useLocalSearchParams } from 'expo-router';

import { atlas, countries, countryGeometry, footprintOf, places } from '@/atlas';
import { NoteScreen } from '@/note/NoteScreen';

/** The Note of the Country, Island or Region `level`/`id`. */
export default function NoteRoute() {
  const { level, id } = useLocalSearchParams<{ level: string; id: string }>();
  const countryName = (countryId: string) => countries.find((c) => c.id === countryId && !c.countryId)?.name;

  if (level === 'region') {
    const region = atlas.region(id);
    if (!region) return <Redirect href="/" />;
    return (
      <NoteScreen
        key={`${level}:${id}`}
        place={{ level, id }}
        name={region.name}
        country={countryName(region.countryId)}
        lon={region.lon}
        lat={region.lat}
      />
    );
  }

  const index = places.findIndex((place) => place.level === level && place.id === id);
  if (index < 0) return <Redirect href="/" />;
  const { name, countryId } = countries[index];
  const { lon, lat } = footprintOf(countryGeometry, index);
  const country = countryId ? countryName(countryId) : undefined;
  return <NoteScreen key={`${level}:${id}`} place={places[index]} name={name} country={country} lon={lon} lat={lat} />;
}
