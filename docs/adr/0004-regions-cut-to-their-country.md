# Regions cut to their Country's outline, shipped as files

Regions come from geoBoundaries gbOpen ADM1, pinned to the release commit of each country (`scripts/geoboundaries.json`) so their `shapeID`s, the Journal's Region ids, never change under a rebuild. At build time each Region is intersected with its Country's world-atlas outline, Islands already carved out (ADR 0003). Regions then fill the Country the globe draws, without spilling over its coast or into its neighbours; a Region left with less than a tenth of its area is dropped, which removes the Regions made of Islands (Corse, Illes Balears, Canarias, Italy's Isole) and keeps a tap on an Island on the Island. A Region of Somalia or Cyprus goes to Somaliland or Northern Cyprus when most of it lies there.

The outlines of each Country's Regions are an asset file (`assets/regions/<id>.geo`), loaded and decoded on the JS thread the first time the Country is selected, while the globe flies on the UI thread. Only a small index (id, name, Country, centre) is in the JS bundle, for the Journal's rollup and the sheet's names.

## Consequences

- Building the Regions needs the geoBoundaries files: `npm run data:regions` downloads them once (~130 MB) into `node_modules/.cache`.
- The 42 Countries without Regions (territories without gbOpen ADM1, Vatican, Monaco, Antarctica…) are listed in `scripts/regions.ts`; the build fails for any other.
- The coast of a Region is world-atlas 50m's wherever geoBoundaries reaches beyond it, so Regions never show a different coastline from their Country's.
