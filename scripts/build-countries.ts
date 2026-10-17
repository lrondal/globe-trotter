// Usage: npm run data:countries. Writes assets/data/countries.json from world-atlas 50m.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

import { buildCountries } from './countries.ts';

const require = createRequire(import.meta.url);
const out = new URL('../assets/data/countries.json', import.meta.url);
const data = buildCountries(require('world-atlas/countries-50m.json'));
writeFileSync(out, JSON.stringify(data));
console.log(`${data.countries.length} countries, ${data.arcs.length} arcs`);
