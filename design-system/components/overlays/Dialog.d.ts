import type { ReactNode } from 'react';
/** Centered confirmation dialog over a scrim. Use only for destructive or irreversible actions. */
export interface DialogProps {
  open?: boolean;
  title?: string;
  children?: ReactNode;
  /** Buttons, right-aligned */
  actions?: ReactNode;
  absolute?: boolean;
}
export declare function Dialog(props: DialogProps): JSX.Element;
