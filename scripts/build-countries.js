// Joins the hand-written capital coordinates with country metadata, then checks
// every capital against the Natural Earth borders. Output: data/countries.json
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoContains, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const worldCountries = require('world-countries');
const list = worldCountries.default ?? worldCountries;
const atlas = require('world-atlas/countries-10m.json');
const geo = feature(atlas, atlas.objects.countries).features;

const NAME_OVERRIDES = { XK: 'Kosovo', PS: 'Palestine', VA: 'Vatican City', CD: 'DR Congo', CG: 'Republic of the Congo' };

const rows = readFileSync('data/capitals.csv', 'utf8').trim().split(/\r?\n/).map((l) => l.split(';'));
const out = [];
const problems = [];
for (const [iso2, capital, lat, lon] of rows) {
  const meta = list.find((c) => c.cca2 === iso2);
  if (!meta) { problems.push(`${iso2}: no metadata`); continue; }
  const name = NAME_OVERRIDES[iso2] ?? meta.name.common;
  const ccn3 = meta.ccn3 || null;
  const point = [Number(lon), Number(lat)];
  const shape = geo.find((f) => (ccn3 && String(f.id) === ccn3) || (iso2 === 'XK' && f.properties.name === 'Kosovo'));
  if (!shape) problems.push(`${iso2} ${name}: no border shape`);
  else if (!geoContains(shape, point)) {
    // Coastal and island capitals can fall just outside a simplified border.
    let nearest = Infinity;
    const walk = (c) => {
      if (typeof c[0] === 'number') nearest = Math.min(nearest, geoDistance(c, point));
      else c.forEach(walk);
    };
    walk(shape.geometry.coordinates);
    const km = nearest * 6371;
    if (km > 25) problems.push(`${iso2} ${name} / ${capital}: ${km.toFixed(0)} km outside its border`);
  }
  out.push({
    iso2, ccn3, name, capital, lat: Number(lat), lon: Number(lon),
    region: meta.region, subregion: meta.subregion,
    demonym: meta.demonyms?.eng?.m ?? null,
    languages: Object.keys(meta.languages ?? {}),
  });
}
out.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync('data/countries.json', JSON.stringify(out, null, 1));
console.log(`${out.length} countries written`);
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'All capitals verified against borders');
