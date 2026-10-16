import type { ReactNode } from 'react';
/** Exploration status label: the three states of the globe. */
export interface StatusBadgeProps {
  status?: 'visited' | 'wish' | 'unexplored';
  /** Override the default label (Visité / À visiter / Non exploré) */
  children?: ReactNode;
  size?: 'md' | 'sm';
}
export declare function StatusBadge(props: StatusBadgeProps): JSX.Element;
