// What « Effacer » (Clear) and « Supprimer » (Delete) take away, as the confirmation names it.
// Phrased so nothing agrees with the Place's own name: « le pays », « la région »… carry it.
import type { Mark, PlaceRef } from '@/journal/journal';

/** What a Place holds of its own, which a Clear or a Delete takes. */
export type Erasable = {
  level: PlaceRef['level'];
  name: string;
  mark: Mark | null;
  hasNote: boolean;
  todos: number;
  photos: number;
};

const MARK_LABEL: Record<Mark, string> = { visited: 'Visité', wish: 'À visiter' };

/**
 * Each level as the subject of a sentence, and what of it stays. Its Status may stay too, from
 * the Places inside it: the body does not say it turns Unexplored.
 */
const SUBJECT: Record<Exclude<PlaceRef['level'], 'city'>, { noun: string; inside: string }> = {
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

/** Whether « Effacer » has anything to take: a Country, an Island or a Region holding nothing of its own has not. */
export const canClear = (e: Erasable) => e.level !== 'city' && contentOf(e).length > 0;

const IRREVERSIBLE = 'Action définitive.';
const ROLL = 'Votre pellicule n’est pas touchée.';

/** The confirmation of a Clear, or of a Delete for a City: its title, body and button. */
export function eraseDialog(e: Erasable): { title: string; body: string; confirm: string } {
  const content = contentOf(e);
  const roll = e.photos > 0 ? [ROLL] : [];
  if (e.level === 'city') {
    const lost = content.length > 0 ? `, avec ${joined(content)}` : '';
    return {
      title: `Supprimer ${e.name} ?`,
      body: [`La ville sera supprimée de Globe trotter${lost}.`, ...roll, IRREVERSIBLE].join(' '),
      confirm: 'Supprimer',
    };
  }
  const { noun, inside } = SUBJECT[e.level];
  return {
    title: `Effacer ${e.name} ?`,
    body: [`${noun} perdra ${joined(content)}.`, inside, ...roll, IRREVERSIBLE].join(' '),
    confirm: 'Effacer',
  };
}
