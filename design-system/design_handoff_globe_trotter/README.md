# Handoff: Globe trotter — iOS app

## Overview
Globe trotter is a mobile app (iOS first, light theme, French UI) for keeping a record of the places you have visited. Its main view is a 3D globe you can rotate and zoom. Countries are colored by status: **visité** (terracotta), **à visiter** (ochre), **non exploré** (paper grey). Tapping a country centers it, zooms to fit, and reveals its regions. Each country, region and city can hold a photo, a note and a checklist. Places you want to visit can be pinned ("Envies").

## About the design files
The files in this bundle are **design references created in HTML/React**. They are prototypes that show the intended look and behavior, not production code to ship. The task is to **recreate them in a real mobile codebase**. No codebase exists yet. Recommended stack:
- **Expo (React Native) + TypeScript**
- Globe: `d3-geo` (orthographic projection) drawn with `@shopify/react-native-skia` (or `react-native-svg`). Gestures with `react-native-gesture-handler` and `react-native-reanimated`.
- Data: `world-atlas` countries-110m (TopoJSON) + `topojson-client`. Regions come from geoBoundaries ADM1 (ODbL licence). 22 countries are pre-simplified in `assets/regions/`. Ship them all pre-simplified rather than fetching at runtime.
- Storage: `expo-sqlite` (or WatermelonDB) offline-first. Photos: `expo-image-picker` + `expo-file-system`.
- Icons: `lucide-react-native`. Fonts: `expo-font` with the files in `fonts/`.

A native SwiftUI build is also valid. The tokens and specs below are platform-neutral.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, shadows and interactions are final. Recreate them pixel-perfectly. Exact values are in `tokens/*.css` and `readme.md` (project root).

## Screens / views
Frame: iPhone 402×874pt. Screen gutter 20. Tab bar at the bottom (Globe · Carnet · Envies · Profil), with a 26pt home-indicator inset below it.

### 1. Globe (`ui_kits/mobile/GlobeScreen.jsx`)
- **Globe**: full-bleed below a 96pt top band. Diameter = 0.98 × min(width, height). Orthographic projection with a 10° graticule.
  - Ocean `#ECE7DC`, land `#DCD5C6`, borders 0.5px `#F4F1EA`, rim 1px `#D3CCBD`.
  - Visited `#C4572E`, wish `#E9C48F`. Selected country: 1.5px `#1B1A17` outline, drawn on top.
- **Search**: pill input at top 58, full width minus gutters. 44pt tall, `#FBF9F4` fill, 1px `#D3CCBD` border, shadow-1, leading `search` icon. Placeholder "Rechercher un pays, une ville".
- **Filter chips** (bottom-left, stacked with 8pt gap; hidden when a sheet is open). Each is a 36pt pill with a 10pt dot, label and count: "Visité 16", "À visiter 6", "Non exploré 155". Tapping toggles that color layer. A deselected chip has a hollow dot, transparent background and muted text.
- **Map buttons** (bottom-right, 10pt gap): 44pt round raised buttons for `locate-fixed` (recentre: flies to the position at zoom 1, or explains how to turn location on), `plus` and `minus`. ± zooms ×1.6 relative to the *current* zoom. The column rises above the sheet when one is open.
- **City pins**: 3.5pt ink dots with a 1.2pt paper ring.
- **Location dot**: the user's approximate position, a 6pt sage `#5E7A5A` dot (`--globe-location`) with a 2pt paper ring, drawn under the city pins. Hidden on the far side. Never stored or exported.
- **Photo markers**: round, 1.5pt paper ring, drop shadow. Shown once zoom ≥ 1.9. Diameter = min(38, 16 + 5·zoom). They are only shown on the visible hemisphere.
- Tapping a pin or photo opens that place's note (screen 3).

### 2. Place sheet (`ui_kits/mobile/PlaceSheet.jsx`)
- Bottom sheet, `#FBF9F4` fill, 16pt top radius, shadow-sheet, 36×4 handle. Snap points: peek 28%, half 52%, full (leaves 56pt of globe). Opens at half for a country, peek for a region.
- **Header**:
  - Overline (11pt, 500, uppercase, +0.08em, `#6E6A60`) with the world region, or the country name when a region is selected.
  - Title in Instrument Serif 34pt / 1.05, −0.01em.
  - Status badge, then caption meta: date and coordinates "36.20° N · 138.25° E".
  - Close button: 36pt outline icon button.
- **Visited country**:
  - Cover photo, 16:10, 6pt radius.
  - Note quote in Instrument Serif italic 20/1.3 inside « ».
  - "Ouvrir le carnet" secondary button, full width.
  - "Villes" list built from PlaceRow.
- **Wish / unexplored country**: "Marquer visité" (accent) and "À visiter" / "Retirer" (secondary), side by side.
- **Region selected**: the same actions apply to the region ("Marquer visitée"). Marking a region visited also marks its country visited.

### 3. Note (`ui_kits/mobile/NoteScreen.jsx`)
- Top bar (54pt top inset): back button left, share and delete buttons right (ghost icon buttons).
- Overline with the country (when the place is a city), then the title in Instrument Serif 44/1.
- **Location link**: caption line with a 14pt terracotta `map-pin` icon, date and coordinates, in a 32pt pill whose background turns `#ECE7DC` on hover. Tapping it flies the globe to the city at zoom 6 (or fits the country).
- Photo 4:3. Multiline note input (rows 4). "À faire" checklist: checked items are struck through and muted.
- Photos grid: 3 columns, 4pt gap, 2pt radius, with an "Ajouter" ghost button (camera icon).
- Delete opens a Dialog: "Supprimer Kyoto ?" / "Les photos et les notes de ce lieu seront supprimées." with Annuler (ghost) and Supprimer (primary).

### 4. Carnet / Envies / Profil (`ui_kits/mobile/ListScreens.jsx`)
- Titles in **Hanken Grotesk 600 28/1.15, −0.02em** (not serif).
- **Carnet**:
  - Search input, then groups per country.
  - Each group header is an overline plus a 36pt `map-pin` icon button that shows the country on the globe.
  - Rows are PlaceRow: 56pt min height, 44pt square thumbnail with 4pt radius, name 15/500, meta 13pt muted, 8pt status dot, chevron, 1px `#DDD7CA` separators.
- **Envies**: count line "6 destinations épinglées", then wish rows. Tapping a row goes to the Globe and selects that country.
- **Profil**: stats line, then Switch rows ("Photos sur le globe", "Rotation automatique") and an "Exporter mes voyages" secondary button.

## Interactions & behavior
- **Globe gestures**:
  - Drag rotates (sensitivity 75/scale degrees per px; latitude clamped to ±85°).
  - Pinch or wheel zooms from 0.8× to 24×.
  - Auto-rotation is off by default (0.08°/frame when on).
- **Select country**: flies 900ms with cubic in-out. It centers the country's largest polygon and zooms so its bounds fill 78% of the visible band above the sheet (the projection centre is eased up by an `offsetY` computed from the sheet height). The sheet slides up in 420ms with ease-out cubic-bezier(.2,.7,.2,1).
- **Regions**: shown **only for the selected country**, for any status.
  - On select, the country fill fades (~12%/frame lerp) from its status color to its tint: visited `#F3DDD2`, wish `#F6E8D2`.
  - Region polygons fade in at the same time with 0.6px paper hairlines. Visited regions are `#C4572E`, wish regions `#E9C48F`, the rest are transparent.
  - Region polygons are tappable once mostly faded in. Deselecting fades them out.
- **Toasts**: ink, bottom, 3.2s, with an "Annuler" undo for reversible actions. Examples: "Portugal marqué comme visité", "Kyoto marquée comme visitée".
- **Press states**: buttons scale 0.98, icon buttons 0.94, both over 120ms. Hover/pressed backgrounds go one step darker. Focus shows an ink border, never a glow.
- **Empty state**: "Aucune note pour ce pays."

## State management
- `places`: countries, regions and cities, each with `{ id, parentId, level: 'country'|'region'|'city', status: 'visited'|'wish'|'unexplored', visitedAt?, coords?, coverPhotoId?, note, todos[] }`
- `photos`: `{ id, placeId, uri, takenAt }`
- UI state:
  - `selected` (country id plus optional region name)
  - `filters {visited, wish, unexplored}`
  - `focus` (fly-to request: `{lon,lat,zoom}`, `{fit:countryId}`, or `{zoomBy}`)
  - `sheetSnap`, `activeTab`, `openNoteId`
  - `prefs {photosOnGlobe, autoRotate}`
- Derived counts drive the filter chips.
- Country ids are ISO 3166-1 numeric (they match world-atlas). `ui_kits/mobile/countries.js` maps them to ISO3 codes and French names.

## Design tokens
Source of truth: `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`.
- **Paper**: 0 `#FBF9F4`, 1 `#F4F1EA` (page), 2 `#ECE7DC`, 3 `#DCD5C6`, 4 `#D3CCBD`, line `#DDD7CA`
- **Ink**: 1 `#1B1A17`, 2 `#45413A`, 3 `#6E6A60`, 4 `#9A9488`
- **Terracotta**: 100 `#F3DDD2`, 300 `#DB8A69`, 500 `#C4572E`, 600 `#A8461F` (hover), 700 `#8A3816` (press)
- **Ochre**: 100 `#F6E8D2`, 400 `#E9C48F`, 600 `#B98A3E`, 800 `#6B4E1E` (text on wish)
- **Sage**: 100 `#E3E8DD`, 600 `#5E7A5A`
- **Brick**: 100 `#F2D9D5`, 600 `#B23A2E`
- **Scrim**: rgba(27,26,23,.32)
- **Type**:
  - Instrument Serif 400: 44/1, 34/1.05, 26/1.1, 22/1.15, tracking −0.01em. Italic for quotes.
  - Hanken Grotesk: title 17/600/1.3, body 15/400/1.5, body-strong 15/500, body-s 13/1.45, label 13/500, caption 12/1.35, overline 11/500 uppercase +0.08em.
- **Spacing**: 2, 4, 8, 12, 16, 20, 24, 32, 40, 56. Gutter 20. Minimum hit target 44.
- **Radii**: 2, 4, 6, 10, 16, pill
- **Shadows**:
  - shadow-1 `0 1px 0 rgba(27,26,23,.04), 0 1px 2px rgba(27,26,23,.06)`
  - shadow-2 `0 6px 20px -6px rgba(27,26,23,.16), 0 1px 2px rgba(27,26,23,.06)`
  - sheet `0 -10px 32px -10px rgba(27,26,23,.20)`
  - pin `0 2px 6px rgba(27,26,23,.28)`
- **Motion**: 120 / 220 / 420ms. Ease-out cubic-bezier(.2,.7,.2,1). Ease-in-out cubic-bezier(.6,0,.3,1).

## Assets
- `fonts/`: Instrument Serif (regular and italic) and Hanken Grotesk 400/500/600, from Google Fonts (OFL).
- `assets/regions/<ISO3>.json`: simplified ADM1 boundaries for 22 countries, from geoBoundaries (ODbL, attribution required). Exterior rings are wound clockwise for d3. Other countries were fetched live in the prototype (`ui_kits/mobile/regions-loader.js`). Pre-process them all for production.
- Icons: Lucide (outline, 2px stroke).
- There is no logo: write "Globe trotter" in Instrument Serif. Photos are placeholders and will be user content.

## Files
All paths are relative to the **project root** (this README lives in `design_handoff_globe_trotter/`).
- `ui_kits/mobile/index.html`: interactive prototype. Open it through a local server (`npx serve .`) from the project root.
- `ui_kits/mobile/*.jsx`, `data.js`, `countries.js`, `regions-loader.js`: screens and sample data
- `components/**`: primitives (Button, IconButton, Input, SegmentedControl, Switch, Checkbox, StatusBadge, FilterChip, PhotoTile, PlaceRow, Icon, BottomSheet, Dialog, Toast, TabBar, Globe). Each comes with `.d.ts` props and `.prompt.md` usage notes. `components/globe/Globe.jsx` is the reference implementation of the globe logic (projection, fit, regions fade, markers).
- `tokens/`, `styles.css`: design tokens
- `readme.md` (project root): full brand guide (tone of voice, visual foundations, iconography)
- `SKILL.md`: drop the project folder into `.claude/skills/globe-trotter-design/` so Claude Code applies the design system automatically
