import type { CSSProperties } from 'react';
/** Text field. variant="search" is the pill search over the globe; multiline for travel notes. */
export interface InputProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  /** Leading Lucide icon */
  icon?: string;
  multiline?: boolean;
  rows?: number;
  variant?: 'default' | 'search';
  onChange?: (value: string) => void;
  style?: CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
