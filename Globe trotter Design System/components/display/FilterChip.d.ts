/** Toggle chip filtering the globe by exploration status. */
export interface FilterChipProps {
  status?: 'visited' | 'wish' | 'unexplored';
  label: string;
  count?: number;
  /** Shown on the globe (filled dot) or hidden (hollow dot) */
  selected?: boolean;
  onClick?: () => void;
}
export declare function FilterChip(props: FilterChipProps): JSX.Element;
