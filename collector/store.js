// In-memory news store, saved to disk so a restart keeps history and doesn't
// re-announce old stories.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { isInternationalCrisis, scoreArticle, levelFor } from './scoring.js';

const MAX_ITEMS = 60;
const MAX_SEEN = 1500;
const MAX_ALERTS = 600;
export const ALERT_LIFETIME_MS = 12 * 3_600_000;
const SIMILARITY_LIMIT = 0.72;
const SIMILARITY_DEPTH = 40;
const CRISIS_WINDOW_MS = 24 * 3_600_000;

function normalise(title) {
  return title.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function tokens(title) {
  return new Set(normalise(title).split(' ').filter((w) => w.length > 2));
}

function similarity(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

export class Store {
  constructor(file, countries) {
    this.file = file;
    this.news = new Map(countries.map((c) => [c.iso2, { items: [], seen: new Set() }]));
    this.alerts = [];
    this.feedState = {};
    this.dirty = false;
    this.crisisSightings = [];
    this.load();
    this.rescoreAll();
  }

  load() {
    if (!existsSync(this.file)) return;
    try {
      const saved = JSON.parse(readFileSync(this.file, 'utf8'));
      for (const [iso2, entry] of Object.entries(saved.news ?? {})) {
        const slot = this.news.get(iso2);
        if (!slot) continue;
        slot.items = entry.items;
        slot.seen = new Set(entry.seen);
      }
      this.alerts = saved.alerts ?? [];
      this.feedState = saved.feedState ?? {};
    } catch (err) {
      console.error(`[store] could not read cache, starting fresh: ${err.message}`);
    }
  }

  save() {
    if (!this.dirty) return;
    const news = {};
    for (const [iso2, slot] of this.news) news[iso2] = { items: slot.items, seen: [...slot.seen] };
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify({ news, alerts: this.alerts, feedState: this.feedState }));
    renameSync(tmp, this.file);
    this.dirty = false;
  }

  #withScore(article, iso2, crisisCountries = 0) {
    const impact = scoreArticle({ title: article.title, source: article.source, iso2 }, { crisisCountries });
    return { ...article, impact, level: levelFor(impact) };
  }

  // Distinct countries reporting an international crisis around a moment in time.
  #crisisCountriesAround(time) {
    const near = this.crisisSightings.filter((s) => Math.abs(s.time - time) <= CRISIS_WINDOW_MS);
    return new Set(near.map((s) => s.iso2)).size;
  }

  // Applies the current scoring rules to everything held, including old cache files.
  rescoreAll() {
    this.crisisSightings = [];
    for (const [iso2, slot] of this.news) {
      for (const it of slot.items) if (isInternationalCrisis(it.title)) this.crisisSightings.push({ iso2, time: it.published });
    }
    const current = new Map();
    for (const [iso2, slot] of this.news) {
      slot.items = slot.items.map((it) => {
        const count = isInternationalCrisis(it.title) ? this.#crisisCountriesAround(it.published) : 0;
        const rescored = this.#withScore(it, iso2, count);
        current.set(iso2 + rescored.id, rescored);
        return rescored;
      });
    }
    // Alerts hold copies, so they are swapped for the rescored versions.
    this.alerts = this.alerts.map((a) => current.get(a.iso2 + a.id)).filter(Boolean);
  }

  // Moves stories that belong to another country, then rescores.
  reassign(routeTo) {
    const moves = [];
    for (const [iso2, slot] of this.news) {
      slot.items = slot.items.filter((it) => {
        const target = routeTo(it.title, iso2);
        if (target === iso2) return true;
        moves.push({ target, it });
        return false;
      });
    }
    for (const { target, it } of moves) {
      const slot = this.news.get(target);
      if (slot.seen.has(it.id)) continue;
      slot.seen.add(it.id);
      slot.items.push({ ...it, iso2: target });
    }
    for (const slot of this.news.values()) {
      slot.items.sort((a, b) => b.published - a.published);
      if (slot.items.length > MAX_ITEMS) slot.items.length = MAX_ITEMS;
    }
    if (moves.length) {
      this.dirty = true;
      console.log(`[store] moved ${moves.length} stories to the countries they are about`);
    }
    this.rescoreAll();
  }

  // Adds an article if the country doesn't already have this story.
  // Returns the stored article, or null if it was a duplicate.
  add(iso2, article, now = Date.now()) {
    const slot = this.news.get(iso2);
    const key = createHash('sha1').update(normalise(article.title)).digest('base64url').slice(0, 16);
    if (slot.seen.has(key)) return null;

    slot.seen.add(key);
    if (slot.seen.size > MAX_SEEN) slot.seen.delete(slot.seen.values().next().value);

    // The same story reworded by another outlet shouldn't appear twice.
    const words = tokens(article.title);
    const near = slot.items.slice(0, SIMILARITY_DEPTH).some((it) => similarity(words, tokens(it.title)) >= SIMILARITY_LIMIT);
    if (near) return null;

    if (isInternationalCrisis(article.title)) this.crisisSightings.push({ iso2, time: now });
    const crisisCountries = isInternationalCrisis(article.title) ? this.#crisisCountriesAround(now) : 0;
    const item = this.#withScore({
      id: key,
      iso2,
      title: article.title,
      url: article.url,
      source: article.source,
      published: Math.min(article.published, now),
      firstSeen: now,
    }, iso2, crisisCountries);
    slot.items.push(item);
    slot.items.sort((a, b) => b.published - a.published);
    if (slot.items.length > MAX_ITEMS) slot.items.length = MAX_ITEMS;
    this.dirty = true;
    // It may have been trimmed straight away for being older than everything kept.
    return slot.items.includes(item) ? item : null;
  }

  addAlert(item) {
    this.alerts.push(item);
    if (this.alerts.length > MAX_ALERTS) this.alerts.splice(0, this.alerts.length - MAX_ALERTS);
    this.dirty = true;
  }

  recentAlerts(now = Date.now()) {
    return this.alerts.filter((a) => now - a.firstSeen < ALERT_LIFETIME_MS);
  }

  // Newest stories first, leaving out minor ones unless a country has too few others.
  latest(iso2, limit = 20) {
    const items = this.news.get(iso2)?.items ?? [];
    const substantial = items.filter((it) => it.level > 1);
    if (substantial.length >= limit) return substantial.slice(0, limit);
    const fill = items.filter((it) => it.level === 1).slice(0, limit - substantial.length);
    return [...substantial, ...fill].sort((a, b) => b.published - a.published);
  }

  count(iso2) {
    return this.news.get(iso2)?.items.length ?? 0;
  }
}
