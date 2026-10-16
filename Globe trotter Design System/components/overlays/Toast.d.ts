/** Brief ink confirmation at the bottom of the screen, with optional undo action. */
export interface ToastProps {
  message: string;
  icon?: string;
  action?: string;
  onAction?: () => void;
  visible?: boolean;
}
export declare function Toast(props: ToastProps): JSX.Element;
