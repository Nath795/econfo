// Assembles the static site: pages, libraries, map, interface text and capital names.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES, UI_EN, UI_HANDWRITTEN, UI_MACHINE_SOURCE } from '../collector/i18n.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.SITE_DIR ?? join(ROOT, 'site');
const nm = join(ROOT, 'node_modules');

const copy = (from, to) => {
  mkdirSync(dirname(join(OUT, to)), { recursive: true });
  cpSync(from, join(OUT, to), { recursive: true });
};
const writeJson = (path, value) => {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};

copy(join(ROOT, 'public'), '.');
copy(join(nm, 'three/build/three.module.js'), 'vendor/three/three.module.js');
copy(join(nm, 'three/build/three.core.js'), 'vendor/three/three.core.js');
copy(join(nm, 'three/examples/jsm/controls/OrbitControls.js'), 'vendor/three/addons/controls/OrbitControls.js');
copy(join(nm, 'topojson-client/dist/topojson-client.min.js'), 'vendor/topojson-client.min.js');
copy(join(nm, '@fontsource-variable/manrope/index.css'), 'vendor/manrope/index.css');
copy(join(nm, '@fontsource-variable/manrope/files'), 'vendor/manrope/files');
copy(join(nm, 'world-atlas/countries-50m.json'), 'vendor/world.json');

const countries = JSON.parse(readFileSync(join(ROOT, 'data/countries.json'), 'utf8'));
writeJson('data/countries.json', countries.map(({ iso2, ccn3, name, capital, lat, lon }) => ({ iso2, ccn3, name, capital, lat, lon })));

writeJson('data/languages.json', LANGUAGES);
writeJson('data/i18n/en.json', UI_EN);
writeJson('data/i18n/machine-source.json', UI_MACHINE_SOURCE);
for (const [lang, strings] of Object.entries(UI_HANDWRITTEN)) writeJson(`data/i18n/${lang}.json`, { ...UI_EN, ...strings });

for (const lang of Object.keys(UI_HANDWRITTEN)) {
  const file = join(ROOT, `data/capitals/${lang}.json`);
  if (existsSync(file)) copy(file, `data/capitals/${lang}.json`);
}
// Tells GitHub Pages to serve every file exactly as it is.
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`Site built in ${OUT}`);
