import type { ReactNode } from 'react';
/** Draggable-looking sheet rising over the globe; the main container for place details. Tap the handle to cycle snap points. */
export interface BottomSheetProps {
  open?: boolean;
  snap?: 'peek' | 'half' | 'full';
  onSnap?: (snap: 'peek' | 'half' | 'full') => void;
  header?: ReactNode;
  children?: ReactNode;
  /** Position absolutely in its (relative) parent. Default true */
  absolute?: boolean;
}
export declare function BottomSheet(props: BottomSheetProps): JSX.Element;
