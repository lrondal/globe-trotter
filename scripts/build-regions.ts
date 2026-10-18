// Usage: npm run data:regions, after data:countries. Downloads geoBoundaries ADM1 once into
// node_modules/.cache, then writes assets/data/regions.json (the index, in the JS bundle),
// assets/regions/<Country id>.geo (the outlines, loaded on demand) and src/atlas/regionFiles.ts.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { download, featuresOf } from './geoboundaries.ts';
import { buildRegions, checkRegions } from './regions.ts';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const cache = path('../node_modules/.cache/geoboundaries');
await download(cache);

const atlas = JSON.parse(readFileSync(path('../assets/data/countries.json'), 'utf8'));
const built = buildRegions(atlas, (iso3) => featuresOf(cache, iso3));
checkRegions(atlas, built);

writeFileSync(path('../assets/data/regions.json'), JSON.stringify(built.index));
rmSync(path('../assets/regions'), { recursive: true, force: true });
mkdirSync(path('../assets/regions'));
const ids = [...built.files.keys()].sort();
for (const id of ids) writeFileSync(path(`../assets/regions/${id}.geo`), JSON.stringify(built.files.get(id)));
writeFileSync(
  path('../src/atlas/regionFiles.ts'),
  [
    '// Made by scripts/build-regions.ts: do not edit. The asset of each Country with Regions,',
    '// bundled as a file (metro.config.js) rather than as JS, so it loads only when asked.',
    '/* eslint-disable @typescript-eslint/no-require-imports */',
    'export const REGION_FILES: Record<string, number> = {',
    ...ids.map((id) => `  '${id}': require('../../assets/regions/${id}.geo'),`),
    '};',
    '',
  ].join('\n'),
);
const regions = Object.values(built.index).flat().length;
console.log(`${regions} Regions in ${ids.length} Countries`);
