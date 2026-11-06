# econfo

A public 3D globe of economic news. Click a capital to read that country's latest economic
stories. New stories raise a notification and put a dot on the capital; colour and size show the
estimated economic impact, from dark green (minor) to flashing red (an international crisis).

The whole site is static files on GitHub Pages. A scheduled GitHub Actions job collects the news
about every 30 minutes, so nothing needs to stay running on anyone's computer.

## How it works

| Part | File | Job |
| --- | --- | --- |
| Sources | `collector/sources.js` | National outlets' feeds, regional feeds, GDELT |
| Collector | `collector/collect.js` | Reads the sources, scores stories, writes JSON |
| Impact score | `collector/scoring.js` | Rule-based 0 to 10 estimate from the headline, never shown |
| Schedule | `.github/workflows/update.yml` | Runs the collector and publishes to the `gh-pages` branch |
| Translation | `public/js/translate.js` | Translates headlines in each visitor's browser |
| Globe | `public/js/globe.js` | three.js map, capital markers, impact dots |
| Interface | `public/js/main.js` | Notifications, news panel, search |

## Sources and credits

News data comes partly from the [GDELT Project](https://www.gdeltproject.org/), which requires this
citation, and from RSS feeds published by the outlets named beside each story. Headlines link to the
original articles, and no article text is republished. Google News isn't used, because its feed
terms only allow personal use.

Translations use Google's public translate endpoint from each visitor's browser. It's unofficial
and can refuse requests, in which case the original headline shows.

Map data: Natural Earth via [world-atlas](https://github.com/topojson/world-atlas).

## Limits

- Updates arrive about every 30 minutes, and GitHub can delay scheduled runs.
- Coverage depends on the sources: some small countries have few stories or none.
- Impact scores are keyword rules applied to headlines, so individual stories can be misjudged.
- Stories are sorted by the country a headline names, which mostly works for English names.

## Run it locally

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run collect
```

Then serve the `site` folder with any static file server. Add `?demo=1` to the address to see one
labelled sample of each notification colour.

```bash
npm test
```
