import type { CSSProperties } from 'react';
/** Lucide icon (1.5–2px stroke outline set) rendered as a CSS mask so it inherits currentColor. */
export interface IconProps {
  /** Lucide icon name, kebab-case, e.g. "map-pin", "globe", "notebook-pen" */
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
