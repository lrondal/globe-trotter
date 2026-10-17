import type { CSSProperties } from 'react';
export interface GlobePoint { lon: number; lat: number; label?: string }
export interface GlobePhoto extends GlobePoint { src?: string }
/**
 * Interactive orthographic globe — the main view. Drag to rotate, wheel/pinch to zoom.
 * Countries are colored by status; photos appear as round markers once zoomed past photoZoom.
 * Requires window.d3 (d3@7) and window.topojson (topojson-client@3) loaded from CDN.
 * @startingPoint section="Globe" subtitle="Globe 3D interactif, filtres de couleur" viewport="700x420"
 */
export interface GlobeProps {
  /** ISO 3166-1 numeric ids of visited countries (e.g. 250 = France) */
  visited?: Array<number | string>;
  /** ISO numeric ids of pinned "à visiter" countries */
  wish?: Array<number | string>;
  /** Small ink pins for cities */
  pins?: GlobePoint[];
  /** The user's position: a sage dot 6pt across with a 1.5pt paper ring, close to a city pin, under the city pins. Never stored. */
  location?: GlobePoint | null;
  /** Photo markers shown when zoomed in */
  photos?: GlobePhoto[];
  /** Which status layers are colored */
  filters?: { visited?: boolean; wish?: boolean; unexplored?: boolean };
  /** Highlighted country id (ink outline) */
  selected?: number | string | null;
  /**
   * Animate the globe. {lon,lat,zoom}: fly to a point (zoom 1 = whole globe).
   * {fit: countryId}: center the country and zoom so it fills the visible area (respects offsetY).
   * {zoomBy: 1.6}: zoom relative to the current zoom. Change `t` to re-trigger the same request.
   */
  focus?: { lon?: number; lat?: number; zoom?: number; fit?: number | string; pad?: number; zoomBy?: number; t?: number } | null;
  /**
   * Regional subdivisions per country id. When a country is selected its regions appear (any status). A visited/wish country also fades to its soft tint;
   * regions are drawn: visited regions terracotta, wish regions ochre, others transparent over the tint.
   * Features load lazily from url.
   */
  regions?: Record<string | number, { url?: string; load?: () => Promise<any>; features?: any[]; visited?: string[]; wish?: string[] }>;
  /** Vertical shift of the globe centre in px (negative = up), eased. Use to keep the focus visible above a bottom sheet. */
  offsetY?: number;
  /** Maximum zoom factor. Default 24 (enough to read small regions) */
  maxZoom?: number;
  onSelectRegion?: (region: { country: number; name: string; status: 'visited' | 'wish' | 'unexplored'; centroid: [number, number] }) => void;
  /** Tap on a city pin or photo marker */
  onSelectPlace?: (place: GlobePoint | GlobePhoto) => void;
  onSelect?: (country: { id: number; name: string; centroid: [number, number] }) => void;
  /** Zoom factor from which photo markers appear. Default 1.8 */
  photoZoom?: number;
  autoRotate?: boolean;
  initialRotate?: [number, number];
  /** Globe diameter relative to the smaller container side. Default 0.88 */
  padding?: number;
  style?: CSSProperties;
}
export declare function Globe(props: GlobeProps): JSX.Element;
