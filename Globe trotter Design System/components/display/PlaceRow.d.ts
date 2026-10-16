/** List row for a country, region or city. */
export interface PlaceRowProps {
  name: string;
  /** Secondary line, e.g. "4 villes · avril 2024" */
  meta?: string;
  status?: 'visited' | 'wish' | 'unexplored';
  photo?: string;
  showPhoto?: boolean;
  last?: boolean;
  onClick?: () => void;
}
export declare function PlaceRow(props: PlaceRowProps): JSX.Element;
