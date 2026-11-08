// « Effacer » (a Clear) and « Supprimer » (a Delete), as the Place sheet offers and confirms them:
// what they would take of a Place, and the French that names it. Phrased so nothing agrees with
// the Place's own name: « le pays », « la région »… carry the agreement.
import type { Journal, Mark, PlaceRef } from '@/journal/journal';
import { placeName } from '@/journal/placeName';

/** What a Place holds of its own, which a Clear, or a Delete for a City, would take. */
export type Erasable = {
  level: PlaceRef['level'];
  name: string;
  /** A Custom City, gone from Globe trotter once Deleted; one of the list only leaves the Journal. */
  custom: boolean;
  mark: Mark | null;
  hasNote: boolean;
  todos: number;
  photos: number;
  /** The name of the Country whose Plan ends with it, its last Place marked Wish; else null. */
  endsPlan: string | null;
};

/**
 * What « Effacer » or « Supprimer » would take of a Place: a Delete for a City in the Journal, a
 * Clear for a Country, an Island or a Region holding something of its own; or null, neither
 * offered.
 */
export function erasableOf(journal: Journal, place: PlaceRef): Erasable | null {
  if (place.level === 'city' && !journal.city(place.id)) return null;
  const record = journal.place(place);
  const mark = record?.mark ?? null;
  const countryId = journal.countryOf(place);
  const country = countryId === undefined ? null : ({ level: 'country', id: countryId } as const);
  const wishes = country
    ? journal.itinerary(country.id).length + (journal.place(country)?.mark === 'wish' ? 1 : 0)
    : 0;
  const erasable: Erasable = {
    level: place.level,
    name: placeName(journal, place),
    custom: journal.city(place.id)?.custom === true && place.level === 'city',
    mark,
    hasNote: (record?.note ?? '') !== '',
    todos: journal.todos(place).length,
    photos: journal.photos(place).length,
    endsPlan: country && mark === 'wish' && wishes === 1 ? placeName(journal, country) : null,
  };
  return place.level === 'city' || contentOf(erasable).length > 0 ? erasable : null;
}

/** The sheet's button offering a Clear, or a Delete for a City. */
export const ERASE_LABEL: Record<PlaceRef['level'], string> = {
  country: 'Effacer le pays',
  island: 'Effacer l’île',
  region: 'Effacer la région',
  city: 'Supprimer la ville',
};

/** The toast after a Clear or a Delete, agreeing with « le pays », « la région »… */
export const ERASED: Record<PlaceRef['level'], string> = {
  country: 'Effacé',
  island: 'Effacée',
  region: 'Effacée',
  city: 'Supprimée',
};

const MARK_LABEL: Record<Mark, string> = { visited: 'Visité', wish: 'À visiter' };

/**
 * Each level Cleared as the subject of a sentence, and what of it stays. Its Status may stay
 * too, from the Places inside it: the body does not say it turns Unexplored.
 */
const CLEARED: Record<Exclude<PlaceRef['level'], 'city'>, { noun: string; inside: string }> = {
  country: { noun: 'Le pays', inside: 'Ses régions, îles et villes ne sont pas touchées.' },
  island: { noun: 'L’île', inside: 'Ses villes ne sont pas touchées.' },
  region: { noun: 'La région', inside: 'Ses villes ne sont pas touchées.' },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** « a, b et c ». */
const joined = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;

/** What the Place holds, in the order the sheet shows it: « son statut « Visité », sa note et 3 photos ». */
const contentOf = (e: Erasable) =>
  [
    e.mark && `son statut « ${MARK_LABEL[e.mark]} »`,
    e.hasNote && 'sa note',
    e.todos > 0 && plural(e.todos, 'élément « À faire »', 'éléments « À faire »'),
    e.photos > 0 && plural(e.photos, 'photo', 'photos'),
  ].filter((item): item is string => typeof item === 'string');

const IRREVERSIBLE = 'Action définitive.';
const ROLL = 'Votre pellicule n’est pas touchée.';

/** The confirmation of a Clear, or of a Delete for a City: its title, body and button. */
export function eraseDialog(e: Erasable): { title: string; body: string; confirm: string } {
  const content = contentOf(e);
  const after = [
    ...(e.endsPlan ? [`Le projet « ${e.endsPlan} » prendra fin, avec sa date prévue.`] : []),
    ...(e.photos > 0 ? [ROLL] : []),
    IRREVERSIBLE,
  ];
  if (e.level === 'city') {
    const lost = content.length > 0 ? `, avec ${joined(content)}` : '';
    const gone = e.custom ? 'La ville sera supprimée de Globe trotter' : 'La ville quittera votre Carnet';
    return { title: `Supprimer ${e.name} ?`, body: [`${gone}${lost}.`, ...after].join(' '), confirm: 'Supprimer' };
  }
  const { noun, inside } = CLEARED[e.level];
  return {
    title: `Effacer ${e.name} ?`,
    body: [`${noun} perdra ${joined(content)}.`, inside, ...after].join(' '),
    confirm: 'Effacer',
  };
}
