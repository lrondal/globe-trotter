# PROTOTYPE — Globe UX (throwaway)

**Question:** does the globe feel right under a finger on a real iPhone, with the real data volume (50m countries, ADM1 regions for every country)?

Not production code. Lives on branch `prototype/globe-ux` only; the validated answer goes into the real app, not this code.

## Run it

1. Install **Expo Go** on the iPhone (App Store).
2. PC and iPhone on the same Wi-Fi.
3. From this folder:
   ```
   npm install
   npx expo start
   ```
4. Scan the QR code with the iPhone camera.

If the phone can't reach the PC (corporate/guest Wi-Fi), use `npx expo start --tunnel`.

## What to try

- **Rotate** with one finger: speed, momentum (toggle *Inertie*), the ±85° latitude stop.
- **Pinch** zoom 0.8×–24×, and the + / − buttons (×1.6).
- **Tap** countries, including tiny ones: Singapour, Malte, Luxembourg, Monaco, Caribbean islands. Compare *Tap tolérant* on/off.
- **Select** a country: 900 ms fly-to, fit above the sheet, regions fade in. Tap a region inside it. Tap the sheet handle to switch peek/half.
- **Detail**: *auto* draws 110m while moving and 50m at rest. Compare with *50m* always: is the switch visible? Is 50m fluid enough on its own?
- **Rendu SVG vs Builder**: two ways of building the Skia paths. Watch `ms/img`.

## Debug panel (top)

`fps` while moving · `ms/img` = JS time to project and build paths per frame (must stay well under 16 ms for 60 fps) · `pays dessinés` after culling · load times of the world data and of the selected country's regions.

## Data

`node scripts/build-data.mjs <dir>` regenerates `assets/` and `src/regionIndex.ts` from world-atlas and geoBoundaries ADM1 simplified GeoJSON (one `<ISO3>.geojson` per country in `<dir>`). geoBoundaries licences vary per country (some are CC BY-SA / ODbL): check before shipping.
