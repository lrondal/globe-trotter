import type { CSSProperties } from 'react';
/** Photo attached to a country, region or city. Without src renders a hatched paper placeholder. */
export interface PhotoTileProps {
  src?: string;
  /** Alt text, also the placeholder label */
  label?: string;
  /** Overlay caption (only on real photos) */
  caption?: string;
  /** CSS aspect-ratio, default "4/3" */
  ratio?: string;
  radius?: string;
  shape?: 'rect' | 'circle';
  style?: CSSProperties;
}
export declare function PhotoTile(props: PhotoTileProps): JSX.Element;
