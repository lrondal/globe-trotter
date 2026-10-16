import type { CSSProperties } from 'react';
/** Icon-only button. raised = floating round button over the globe. */
export interface IconButtonProps {
  /** Lucide icon name */
  icon: string;
  /** Accessible label (required) */
  label: string;
  variant?: 'ghost' | 'outline' | 'raised';
  size?: 'md' | 'sm';
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
