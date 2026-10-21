// Usage: npm run data:cities, after data:regions. Downloads GeoNames cities1000 and the
// alternate names once into node_modules/.cache (about 215 MB), then writes
// assets/data/cities.tsv. Needs `unzip`, or a `tar` that reads zip files (bsdtar).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import { openAtlas } from '../src/atlas/atlas.ts';
import {
  byPopulation,
  lineOf,
  namesOf,
  parseAlternateName,
  parseCity,
  place,
  type AlternateName,
  type Placement,
} from './cities.ts';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const cache = path('../node_modules/.cache/geonames');
const read = (relative: string) => JSON.parse(readFileSync(path(`../assets/${relative}`), 'utf8'));

mkdirSync(cache, { recursive: true });
for (const file of ['cities1000.zip', 'alternateNamesV2.zip']) {
  if (existsSync(`${cache}/${file}`)) continue;
  console.log(`downloading ${file}`);
  const response = await fetch(`https://download.geonames.org/export/dump/${file}`);
  if (!response.ok) throw new Error(`${file}: ${response.status}`);
  writeFileSync(`${cache}/${file}`, Buffer.from(await response.arrayBuffer()));
}

/** Each line of `entry` in the zip `file`, streamed: the alternate names are 800 MB unzipped. */
async function* linesOf(file: string, entry: string): AsyncGenerator<string> {
  const unzip = (command: string, args: string[]) =>
    new Promise<ReturnType<typeof spawn>>((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'] });
      child.once('spawn', () => resolve(child));
      child.once('error', reject);
    });
  const zip = `${cache}/${file}`;
  const child = await unzip('unzip', ['-p', zip, entry]).catch(() => unzip('tar', ['-xOf', zip, entry]));
  yield* createInterface({ input: child.stdout!, crlfDelay: Infinity });
}

const cities = [];
for await (const line of linesOf('cities1000.zip', 'cities1000.txt')) if (line) cities.push(parseCity(line));
const ids = new Set(cities.map((c) => c.id));
const alternates = new Map<string, AlternateName[]>();
for await (const line of linesOf('alternateNamesV2.zip', 'alternateNamesV2.txt')) {
  const name = parseAlternateName(line);
  if (!ids.has(name.geonameId)) continue;
  alternates.set(name.geonameId, [...(alternates.get(name.geonameId) ?? []), name]);
}

const atlas = openAtlas({
  countries: read('data/countries.json'),
  regionIndex: read('data/regions.json'),
  loadRegions: async (countryId) => read(`regions/${countryId}.geo`),
});

const counts: Record<Placement['by'] | 'dropped', number> = { point: 0, nearby: 0, country: 0, dropped: 0 };
const lines: string[] = [];
const placed = new Map<string, Placement>();
for (const city of cities.sort(byPopulation)) {
  const placement = await place(city, atlas);
  if (!placement) {
    counts.dropped++;
    continue;
  }
  counts[placement.by]++;
  placed.set(city.id, placement);
  lines.push(lineOf(city, namesOf(city, alternates.get(city.id) ?? []), placement));
}

// Cities whose place is known: a wrong one means the placing is broken.
const EXPECTED: Record<string, string> = {
  '2988507': '250', // Paris, France
  '2267057': '620', // Lisbon, Portugal
  '1862251': '392', // Honmura (Naoshima), Japon
  '3171457': '380', // Parma, Italie
  '261745': 'i-crete', // Heraklion, on Crète
  '1645528': 'i-bali', // Denpasar, on Bali
};
for (const [id, expected] of Object.entries(EXPECTED)) {
  if (placed.get(id)?.place !== expected) throw new Error(`City ${id} placed in ${placed.get(id)?.place}, not ${expected}`);
}

writeFileSync(path('../assets/data/cities.tsv'), lines.join('\n') + '\n');
console.log(`${lines.length} Cities: ${counts.point} by their point, ${counts.nearby} by land nearby, ${counts.country} by their country; ${counts.dropped} dropped`);
