// Runs on a schedule in GitHub Actions: reads the news feeds, scores the stories and
// writes them as plain JSON files for the static site. Nothing here runs on a visitor's device.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchFeed } from './rss.js';
import { isRelevant } from './scoring.js';
import { Store } from './store.js';
import { allFeeds, buildNameFinder, buildTitleMatcher, gdeltName } from './sources.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.SITE_DIR ?? join(ROOT, 'site');
const STATE_FILE = join(OUT, '_state/state.json');
const BUDGET_MS = Number(process.env.COLLECT_MINUTES ?? 14) * 60_000;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const FEED_CONCURRENCY = 8;
const FEED_FAILURE_RETRY = 6 * HOUR;
const MAX_STORY_AGE = 400 * DAY;
const FIRST_FETCH_FRESH = 2 * HOUR; // A source's first fetch can't tell new from old.
const LATER_FETCH_FRESH = 6 * HOUR;
const TARGET_STORIES = 20;

// GDELT asks for at most one request every 5 seconds.
const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_SPACING_MS = 6000;
const GDELT_REFUSED_WAIT_MS = 60_000;
const GDELT_MAX_REFUSALS = 8;
const GDELT_TERMS = '(economy OR inflation OR "central bank" OR budget OR unemployment OR trade OR GDP)';
const USER_AGENT = 'Mozilla/5.0 (compatible; econfo/1.0; +https://www.gdeltproject.org/)';

const countries = JSON.parse(readFileSync(join(ROOT, 'data/countries.json'), 'utf8'));
mkdirSync(dirname(STATE_FILE), { recursive: true });
const store = new Store(STATE_FILE, countries);

const matchers = new Map(countries.map((c) => [c.iso2, buildTitleMatcher(c)]));
const nameFinders = countries.map((c) => [c.iso2, buildNameFinder(c)]);
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function firstNamedCountry(title) {
  let target = null;
  let first = Infinity;
  for (const [iso2, find] of nameFinders) {
    const at = find(title);
    if (at >= 0 && at < first) { first = at; target = iso2; }
  }
  return target;
}

// A story naming another country, and not this one, belongs to the country it names.
// Regional feeds have no home country, so an unnamed story there is dropped.
function routeTo(title, home) {
  if (home && matchers.get(home)(title)) return home;
  return firstNamedCountry(title) ?? home;
}

function ingest(feed, items, state, now) {
  const freshFor = state.baselined ? LATER_FETCH_FRESH : FIRST_FETCH_FRESH;
  let added = 0;
  for (const article of items) {
    if (now - article.published > MAX_STORY_AGE) continue;
    if (!isRelevant(article.title, { trustedFeed: feed.trusted })) continue;
    const target = routeTo(article.title, feed.iso2);
    if (!target) continue;
    const stored = store.add(target, feed.sourceName ? { ...article, source: feed.sourceName } : article, now);
    if (!stored) continue;
    added++;
    if (now - stored.published <= freshFor) store.addAlert(stored);
  }
  state.baselined = true;
  state.lastOk = now;
  state.failures = 0;
  state.lastError = undefined;
  return added;
}

async function pollFeed(feed) {
  const state = (store.feedState[feed.id] ??= { baselined: false, failures: 0 });
  const now = Date.now();
  if (state.failures > 0 && now - (state.lastTry ?? 0) < FEED_FAILURE_RETRY) return;
  state.lastTry = now;
  try {
    const res = await fetchFeed(feed.url, { etag: state.etag, lastModified: state.lastModified });
    if (res.notModified) {
      state.lastOk = now;
      state.failures = 0;
      return;
    }
    state.etag = res.etag ?? undefined;
    state.lastModified = res.lastModified ?? undefined;
    ingest(feed, res.items, state, now);
  } catch (err) {
    state.failures = (state.failures ?? 0) + 1;
    state.lastError = err.message;
  }
}

async function pollAllFeeds() {
  const feeds = allFeeds();
  let next = 0;
  const worker = async () => {
    while (next < feeds.length) await pollFeed(feeds[next++]);
  };
  await Promise.all(Array.from({ length: FEED_CONCURRENCY }, worker));
  const failing = feeds.filter((f) => store.feedState[f.id]?.failures > 0).length;
  console.log(`Feeds: ${feeds.length - failing} of ${feeds.length} working`);
  return { total: feeds.length, failing };
}

// GDELT: "20261106T130000Z" to a time.
function gdeltTime(s) {
  return Date.parse(String(s).replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'));
}

function tidyGdeltTitle(title) {
  return String(title ?? '').replace(/\s+([,.;:!?%)])/g, '$1').replace(/([(])\s+/g, '$1').replace(/\s+/g, ' ').trim();
}

async function pollGdeltCountry(country) {
  const state = (store.feedState[`gdelt:${country.iso2}`] ??= { baselined: false, failures: 0 });
  const timespan = store.count(country.iso2) < TARGET_STORIES ? '3months' : '2d';
  const params = new URLSearchParams({
    query: `sourcecountry:${gdeltName(country)} ${GDELT_TERMS}`, mode: 'artlist', format: 'json', maxrecords: '50', sort: 'datedesc', timespan,
  });
  const res = await fetch(`${GDELT_ENDPOINT}?${params}`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  if (res.status === 429) return 'refused';
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let articles = [];
  try {
    articles = JSON.parse(body).articles ?? [];
  } catch {
    if (/limit requests/i.test(body)) return 'refused';
    // Anything else that isn't JSON is GDELT explaining a query problem.
    throw new Error(body.slice(0, 80));
  }
  const items = articles.map((a) => ({
    title: tidyGdeltTitle(a.title), url: a.url, source: a.domain ?? 'GDELT', published: gdeltTime(a.seendate),
  })).filter((a) => a.title && /^https?:\/\//.test(a.url) && !Number.isNaN(a.published));
  ingest({ iso2: country.iso2, trusted: true }, items, state, Date.now());
  return 'ok';
}

// Goes through the countries that waited longest, for as long as this run has time.
async function pollGdelt(deadline) {
  const queue = [...countries].sort((a, b) => (store.feedState[`gdelt:${a.iso2}`]?.lastOk ?? 0) - (store.feedState[`gdelt:${b.iso2}`]?.lastOk ?? 0));
  let done = 0;
  let refusals = 0;
  let errors = 0;
  for (const country of queue) {
    if (Date.now() >= deadline || refusals >= GDELT_MAX_REFUSALS) break;
    try {
      const outcome = await pollGdeltCountry(country);
      if (outcome === 'refused') {
        refusals++;
        await sleep(GDELT_REFUSED_WAIT_MS);
        continue;
      }
      refusals = 0;
      done++;
    } catch (err) {
      errors++;
      store.feedState[`gdelt:${country.iso2}`].lastError = err.message;
    }
    await sleep(GDELT_SPACING_MS);
  }
  console.log(`GDELT: ${done} countries read, ${errors} errors${refusals >= GDELT_MAX_REFUSALS ? ', stopped early after repeated refusals' : ''}`);
  return { done, errors };
}

function toClient(item) {
  return {
    id: item.id, iso2: item.iso2, title: item.title, url: item.url, source: item.source,
    published: item.published, firstSeen: item.firstSeen, level: item.level, size: Math.round(item.impact) / 10,
  };
}

function writeJson(path, value) {
  const file = join(OUT, 'data', path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
}

function publish(feedStats, gdeltStats) {
  const counts = countries.map((c) => store.latest(c.iso2).length);
  for (const c of countries) writeJson(`news/${c.iso2}.json`, { news: store.latest(c.iso2).map(toClient) });
  writeJson('alerts.json', store.recentAlerts().map(toClient));
  const status = {
    updatedAt: Date.now(),
    countries: countries.length,
    countriesWithNews: counts.filter((n) => n > 0).length,
    countriesWithFull20: counts.filter((n) => n >= TARGET_STORIES).length,
    feeds: feedStats,
    gdelt: gdeltStats,
  };
  writeJson('status.json', status);
  console.log(`Countries with news: ${status.countriesWithNews} of ${status.countries}; with 20 stories: ${status.countriesWithFull20}`);
}

const started = Date.now();
const feedStats = await pollAllFeeds();
store.dirty = true;
store.save();
const gdeltStats = await pollGdelt(started + BUDGET_MS);
store.dirty = true;
store.save();
publish(feedStats, gdeltStats);
