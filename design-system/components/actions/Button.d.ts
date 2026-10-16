import type { ReactNode, CSSProperties } from 'react';
/**
 * Bouton texte. primary = encre (action principale), accent = terracotta (marquer visité), secondary = contour, ghost = discret.
 * @startingPoint section="Actions" subtitle="Boutons primaire, accent, contour, discret" viewport="700x260"
 */
export interface ButtonProps {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  /** Lucide icon name, e.g. "map-pin" */
  icon?: string;
  iconRight?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
  children?: ReactNode;
  style?: CSSProperties;
}
export declare function Button(props: ButtonProps): JSX.Element;
