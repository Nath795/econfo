import { Globe } from './globe.js';
import { setTranslationLanguage, translate } from './translate.js';

const $ = (id) => document.getElementById(id);

const MAX_VISIBLE_TOASTS = 4;
const MAX_VISIBLE_TOASTS_PHONE = 2; // More would cover the globe on a small screen.
const PHONE_WIDTH = 640;
const SWIPE_CLOSE_PX = 70;
const CHECK_EVERY_MS = 3 * 60_000;
const STALE_AFTER_MS = 3 * 3_600_000;
const TOAST_TRANSLATE_WAIT_MS = 3000;
const LAST_ALERT_KEY = 'econfo.lastAlert';
const NOT_MACHINE_TRANSLATED = /^(sample|fatal)/;
const MAX_QUEUED_TOASTS = 16;
const TOAST_GAP_MS = 700;
const TOAST_MS = { 1: 7000, 2: 8000, 3: 9000, 4: 11000, 5: 15000 };
const DOT_LIFETIME_MS = 12 * 3_600_000;
const READ_KEY = 'econfo.readAt';
const LANG_KEY = 'econfo.lang';
const EXPECTED_STORIES = 20;

const state = {
  countries: [],
  byIso: new Map(),
  selected: null,
  unread: new Map(), // iso2 -> strongest unread alert
  seenAlerts: new Set(),
  readAt: loadReadAt(),
  toastQueue: [],
};
let globe;
let lang = 'en';
let strings = {};
let relativeTime = null;

// Only used if the interface text can't be loaded.
const STARTUP_TEXT = {
  fatalTitle: "The globe couldn't start",
  fatalWebgl: 'Your browser or graphics driver has WebGL turned off, which the 3D map needs.',
  fatalData: 'The map data could not be loaded. Check your connection, then reload the page.',
};

function t(key, vars = {}) {
  const text = strings[key] ?? STARTUP_TEXT[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}

function loadReadAt() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveReadAt() {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(state.readAt));
  } catch {
    // Private windows can block storage; read state then lasts for this visit only.
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function storedLanguage() {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

function timeAgo(ms) {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return relativeTime.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relativeTime.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return relativeTime.format(-days, 'day');
  return new Date(ms).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Keeps right-to-left headlines such as Arabic reading correctly in any layout.
function headline(tag, className, item) {
  const node = el(tag, className, item.title);
  node.dir = 'auto';
  if (item.originalTitle && item.originalTitle !== item.title) node.title = t('original', { title: item.originalTitle });
  return node;
}

/* ---------- Dots ---------- */

function markUnread(alert) {
  if (Date.now() - alert.firstSeen > DOT_LIFETIME_MS) return;
  if (alert.firstSeen <= (state.readAt[alert.iso2] ?? 0)) return;
  if (state.selected?.iso2 === alert.iso2) return; // Already looking at it.
  const current = state.unread.get(alert.iso2);
  if (current && current.size >= alert.size) return;
  state.unread.set(alert.iso2, alert);
  globe.setDot(alert.iso2, alert);
}

function clearUnread(iso2) {
  state.readAt[iso2] = Date.now();
  saveReadAt();
  state.unread.delete(iso2);
  globe.removeDot(iso2);
}

function expireDots() {
  for (const [iso2, alert] of state.unread) {
    if (Date.now() - alert.firstSeen > DOT_LIFETIME_MS) {
      state.unread.delete(iso2);
      globe.removeDot(iso2);
    }
  }
}

/* ---------- Notifications ---------- */

function closeIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 6l12 12M18 6 6 18');
  svg.append(path);
  return svg;
}

function dismissToast(node) {
  if (node.classList.contains('is-leaving')) return;
  node.classList.add('is-leaving');
  setTimeout(() => {
    node.remove();
    pumpToasts();
  }, 220);
}

function showToast(alert) {
  const country = state.byIso.get(alert.iso2);
  const node = el('article', `toast l${alert.level}`);
  node.dataset.iso2 = alert.iso2;
  node.dataset.level = alert.level;
  const main = el('button', 'toast-main');
  main.type = 'button';
  main.append(
    el('span', 'toast-where', `${country.displayName} · ${country.capitalName}`),
    headline('span', 'toast-title', alert),
    el('span', 'toast-meta', `${alert.source} · ${timeAgo(alert.published)}`),
  );
  main.addEventListener('click', () => {
    dismissToast(node);
    openCountry(country);
  });
  const close = el('button', 'toast-close');
  close.type = 'button';
  close.setAttribute('aria-label', t('dismiss'));
  close.append(closeIcon());
  close.addEventListener('click', () => dismissToast(node));
  node.append(main, close);

  // Pausing on hover gives people time to finish reading.
  let timer;
  const arm = () => { timer = setTimeout(() => dismissToast(node), TOAST_MS[alert.level]); };
  node.addEventListener('pointerenter', () => clearTimeout(timer));
  node.addEventListener('pointerleave', arm);
  arm();
  $('toasts').prepend(node);
}

let lastToastAt = 0;
let pumpTimer = null;
let toastsLoading = 0;

async function translatedAlert(alert) {
  if (alert.id.startsWith('demo-')) return alert; // Samples are already in the visitor's language.
  const title = await Promise.race([
    translate(alert.title),
    new Promise((resolve) => { setTimeout(() => resolve(alert.title), TOAST_TRANSLATE_WAIT_MS); }),
  ]);
  return { ...alert, originalTitle: alert.title, title };
}

function pumpToasts() {
  clearTimeout(pumpTimer);
  if (!state.toastQueue.length) return;
  const visible = $('toasts').querySelectorAll('.toast:not(.is-leaving)').length + toastsLoading;
  if (visible >= (innerWidth <= PHONE_WIDTH ? MAX_VISIBLE_TOASTS_PHONE : MAX_VISIBLE_TOASTS)) return; // A closing toast calls this again.
  const wait = lastToastAt + TOAST_GAP_MS - Date.now();
  if (wait > 0) {
    pumpTimer = setTimeout(pumpToasts, wait);
    return;
  }
  // Skip a country that is on screen right now, unless the new story is more serious.
  const onScreen = new Map([...$('toasts').querySelectorAll('.toast:not(.is-leaving)')].map((n) => [n.dataset.iso2, Number(n.dataset.level)]));
  const index = state.toastQueue.findIndex((a) => !onScreen.has(a.iso2) || a.level > onScreen.get(a.iso2));
  if (index < 0) return;
  lastToastAt = Date.now();
  toastsLoading++;
  translatedAlert(state.toastQueue.splice(index, 1)[0]).then((alert) => {
    toastsLoading--;
    showToast(alert);
    pumpToasts();
  });
  pumpToasts();
}

function enqueueToast(alert) {
  // A burst from one country shows its strongest story only; the rest are in its panel.
  const queued = state.toastQueue.findIndex((a) => a.iso2 === alert.iso2);
  if (queued >= 0) {
    if (state.toastQueue[queued].size >= alert.size) return;
    state.toastQueue.splice(queued, 1);
  }
  state.toastQueue.push(alert);
  // Most important first; during a burst the least important drop off the queue.
  state.toastQueue.sort((a, b) => b.size - a.size);
  state.toastQueue.length = Math.min(state.toastQueue.length, MAX_QUEUED_TOASTS);
  pumpToasts();
}

function onAlert(alert, { silent = false } = {}) {
  if (state.seenAlerts.has(alert.id + alert.iso2)) return;
  state.seenAlerts.add(alert.id + alert.iso2);
  markUnread(alert);
  if (!silent) enqueueToast(alert);
  if (state.selected?.iso2 === alert.iso2) loadPanel(state.selected, { highlightNewest: true });
}

/* ---------- News panel ---------- */

function storyNode(item, isNew) {
  const li = el('li', `story${isNew ? ' is-new' : ''}`);
  const a = el('a');
  a.href = item.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  const body = el('div');
  body.append(headline('h3', '', item), el('p', '', `${item.source} · ${timeAgo(item.published)}`));
  a.append(el('span', `mark l${item.level}`), body);
  li.append(a);
  return li;
}

function showSkeleton() {
  const skeletons = Array.from({ length: 7 }, () => {
    const s = el('li', 'skeleton');
    s.append(el('i'), el('i'));
    return s;
  });
  $('panel-news').replaceChildren(...skeletons);
}

let panelRequest = 0;
async function loadPanel(country, { highlightNewest = false } = {}) {
  const request = ++panelRequest;
  try {
    const res = await fetch(dataUrl(`data/news/${country.iso2}.json`));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (request !== panelRequest || state.selected?.iso2 !== country.iso2) return;
    renderPanel(data, highlightNewest);
  } catch {
    if (request !== panelRequest) return;
    $('panel-summary').textContent = '';
    $('panel-news').replaceChildren(el('li', 'panel-note', t('offline')));
  }
}

function renderPanel({ news }, highlightNewest) {
  const summary = $('panel-summary');
  if (!news.length) {
    summary.textContent = '';
    $('panel-news').replaceChildren(el('li', 'panel-note', t('empty')));
    return;
  }
  summary.textContent = news.length >= EXPECTED_STORIES ? t('latest') : t('found', { n: news.length });
  $('panel-news').replaceChildren(...news.map((item, i) => storyNode(item, highlightNewest && i === 0)));
  translatePanel(news, panelRequest);
}

// Headlines appear straight away, then switch to the visitor's language as translations arrive.
function translatePanel(news, request) {
  const headings = $('panel-news').querySelectorAll('.story h3');
  news.forEach((item, i) => {
    translate(item.title).then((title) => {
      if (request !== panelRequest || !headings[i] || title === item.title) return;
      headings[i].textContent = title;
      headings[i].title = t('original', { title: item.title });
    });
  });
}

// On phones the panel is a sheet along the bottom, so the capital must sit above it.
function applyPanelInset() {
  const panel = $('panel');
  globe.setInsets(innerWidth > PHONE_WIDTH ? { right: panel.offsetWidth } : { bottom: panel.offsetHeight });
}

// Dragging the top of the sheet downwards closes it.
function bindSheetSwipe() {
  const panel = $('panel');
  const grips = [panel.querySelector('.sheet-handle'), panel.querySelector('.panel-head')];
  let startY = null;
  const release = (e) => {
    if (startY === null) return;
    const dragged = e.clientY - startY;
    startY = null;
    panel.style.transform = '';
    panel.classList.remove('is-dragging');
    if (dragged > SWIPE_CLOSE_PX) closePanel();
  };
  for (const grip of grips) {
    grip.addEventListener('pointerdown', (e) => {
      if (innerWidth > PHONE_WIDTH || e.target.closest('button')) return;
      startY = e.clientY;
      panel.classList.add('is-dragging');
      grip.setPointerCapture(e.pointerId);
    });
    grip.addEventListener('pointermove', (e) => {
      if (startY !== null) panel.style.transform = `translateY(${Math.max(0, e.clientY - startY)}px)`;
    });
    grip.addEventListener('pointerup', release);
    grip.addEventListener('pointercancel', () => { startY = null; panel.style.transform = ''; panel.classList.remove('is-dragging'); });
  }
}

function openCountry(country) {
  const switching = state.selected?.iso2 !== country.iso2;
  state.selected = country;
  clearUnread(country.iso2);
  $('panel-country').textContent = country.displayName;
  $('panel-capital').textContent = country.capitalName;
  $('panel').hidden = false;
  document.body.classList.add('panel-open');
  if (switching) {
    $('panel-summary').textContent = t('loading');
    showSkeleton();
    $('panel-news').scrollTop = 0;
  }
  applyPanelInset();
  globe.select(country);
  loadPanel(country);
}

function closePanel() {
  state.selected = null;
  panelRequest++;
  $('panel').hidden = true;
  document.body.classList.remove('panel-open');
  globe.setInsets({});
  globe.select(null);
  globe.resumeAutoRotate();
}

/* ---------- Hover label ---------- */

function bindTooltip() {
  const tip = $('tooltip');
  globe.addEventListener('capitalhover', ({ detail: { country, x, y } }) => {
    if (!country) {
      tip.hidden = true;
      return;
    }
    tip.replaceChildren(el('strong', '', country.capitalName), el('span', '', ` · ${country.displayName}`));
    tip.style.left = `${Math.min(x, innerWidth - 240)}px`;
    tip.style.top = `${y}px`;
    tip.hidden = false;
  });
}

/* ---------- Search ---------- */

function bindSearch() {
  const input = $('search');
  const list = $('search-results');
  let results = [];
  let active = 0;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };
  const choose = (country) => {
    input.value = '';
    close();
    input.blur();
    openCountry(country);
  };
  const render = () => {
    list.replaceChildren(...results.map((c, i) => {
      const li = el('li');
      li.id = `result-${c.iso2}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.append(document.createTextNode(c.displayName), el('small', '', c.capitalName));
      // Fires before the input loses focus, unlike click.
      li.addEventListener('pointerdown', (e) => { e.preventDefault(); choose(c); });
      return li;
    }));
    list.hidden = results.length === 0;
    input.setAttribute('aria-expanded', String(!list.hidden));
    if (results[active]) input.setAttribute('aria-activedescendant', `result-${results[active].iso2}`);
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  };
  const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

  input.addEventListener('input', () => {
    const q = fold(input.value.trim());
    if (!q) { results = []; close(); return; }
    const rank = (c) => {
      const name = fold(c.displayName);
      const english = fold(c.name);
      const cap = fold(c.capital);
      const localCap = fold(c.capitalName);
      if (name.startsWith(q) || english.startsWith(q)) return 0;
      if (cap.startsWith(q) || localCap.startsWith(q)) return 1;
      return name.includes(q) || english.includes(q) || cap.includes(q) || localCap.includes(q) ? 2 : 3;
    };
    results = state.countries.map((c) => [rank(c), c]).filter(([r]) => r < 3).sort((a, b) => a[0] - b[0]).slice(0, 8).map(([, c]) => c);
    active = 0;
    render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; results = []; close(); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { active = (active + 1) % results.length; render(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { active = (active - 1 + results.length) % results.length; render(); e.preventDefault(); }
    if (e.key === 'Enter') { choose(results[active]); e.preventDefault(); }
  });
  // The keyboard covers the bottom of a phone screen, so search moves to the top while in use.
  input.addEventListener('focus', () => document.body.classList.add('is-searching'));
  input.addEventListener('blur', () => {
    close();
    document.body.classList.remove('is-searching');
  });
}

/* ---------- Live connection ---------- */

function setLive(mode, text) {
  $('live').className = `live is-${mode}`;
  $('live-text').textContent = text;
}

let dataVersion = 0;
const dataUrl = (path) => `${path}?v=${dataVersion}`;

async function fetchStatus() {
  // The minute in the address gets past caches, so a new update is noticed quickly.
  const res = await fetch(`data/status.json?t=${Math.floor(Date.now() / 60_000)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function showStatus(status) {
  const stale = Date.now() - status.updatedAt > STALE_AFTER_MS;
  setLive(stale ? 'connecting' : 'online', t('live', { time: timeAgo(status.updatedAt), n: status.countriesWithNews }));
}

function loadLastAlert() {
  try {
    return Number(localStorage.getItem(LAST_ALERT_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveLastAlert(time) {
  try {
    localStorage.setItem(LAST_ALERT_KEY, String(time));
  } catch {
    // Without storage, returning visitors only get dots for what they missed.
  }
}

let latestAlertTime = loadLastAlert();

async function applyAlerts() {
  const res = await fetch(dataUrl('data/alerts.json'));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const alerts = await res.json();
  const firstVisit = latestAlertTime === 0;
  let newest = latestAlertTime;
  for (const alert of alerts) {
    // Everyone gets a dot; a notification means it's new since they last looked.
    onAlert(alert, { silent: firstVisit || alert.firstSeen <= latestAlertTime });
    newest = Math.max(newest, alert.firstSeen);
  }
  latestAlertTime = newest;
  saveLastAlert(newest);
}

async function checkForNews() {
  try {
    const status = await fetchStatus();
    if (status.updatedAt !== dataVersion) {
      dataVersion = status.updatedAt;
      await applyAlerts();
      if (state.selected) loadPanel(state.selected);
    }
    showStatus(status);
  } catch {
    setLive('offline', t('reconnecting'));
  }
}

function startCheckingForNews() {
  checkForNews();
  // A phone in a pocket shouldn't use data; it catches up when the page returns.
  setInterval(() => { if (!document.hidden) checkForNews(); }, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForNews(); });
}

/* ---------- Colour preview: open /?demo=1 ---------- */

function runDemo() {
  const samples = [
    ['VU', 1, 0.15, 'sample1'],
    ['KE', 2, 0.35, 'sample2'],
    ['BR', 3, 0.5, 'sample3'],
    ['DE', 4, 0.72, 'sample4'],
    ['US', 5, 1, 'sample5'],
  ];
  samples.forEach(([iso2, level, size, key], i) => {
    setTimeout(() => onAlert({
      id: `demo-${i}`, iso2, level, size, title: t(key), source: 'econfo preview', url: '#', published: Date.now(), firstSeen: Date.now(),
    }), 600 + i * 900);
  });
}

/* ---------- Start ---------- */

function loadTopojson() {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'vendor/topojson-client.min.js';
    s.onload = () => resolve(window.topojson);
    s.onerror = () => reject(new Error('Could not load the map library.'));
    document.head.append(s);
  });
}

function languageLabel(code) {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    return code;
  }
}

// Same rules as normaliseLanguage in collector/i18n.js, for the visitor's browser.
function supportedLanguage(raw, languages) {
  if (typeof raw !== 'string') return null;
  if (/^zh-(tw|hk|mo|hant)/i.test(raw)) return 'zh-TW';
  const exact = languages.find((l) => l.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const base = raw.split('-')[0].toLowerCase();
  const code = { nb: 'no', nn: 'no', iw: 'he', tl: 'fil', in: 'id', zh: 'zh-CN' }[base] ?? base;
  return languages.includes(code) ? code : null;
}

function applyInterfaceText() {
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll('[data-i18n-label]')) node.setAttribute('aria-label', t(node.dataset.i18nLabel));
}

// Languages without hand-written text start in English and switch as translations arrive.
async function translateInterface() {
  const source = await fetch('data/i18n/machine-source.json').then((r) => r.json());
  await Promise.all(Object.keys(strings).filter((key) => !NOT_MACHINE_TRANSLATED.test(key)).map(async (key) => {
    const out = await translate(source[key] ?? strings[key], { from: 'en' });
    // A translation that loses a placeholder would show broken text, so English stays.
    if ((strings[key].match(/\{\w+\}/g) ?? []).every((p) => out.includes(p))) strings[key] = out;
  }));
  applyInterfaceText();
}

// The visitor's browser locale decides the language, unless they picked one.
async function setUpLanguage() {
  const languages = await fetch('data/languages.json').then((r) => r.json());
  const wanted = (navigator.languages?.length ? navigator.languages : [navigator.language]).map((l) => supportedLanguage(l, languages)).filter(Boolean);
  const saved = storedLanguage();
  lang = languages.includes(saved) ? saved : (wanted[0] ?? 'en');
  setTranslationLanguage(lang);
  const own = await fetch(`data/i18n/${lang}.json`);
  const handWritten = own.ok;
  strings = handWritten ? await own.json() : await fetch('data/i18n/en.json').then((r) => r.json());
  relativeTime = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' });
  document.documentElement.lang = lang;
  applyInterfaceText();
  if (!handWritten) translateInterface().catch(() => {}); // English stays if this fails.
  setLive('connecting', t('connecting'));

  const select = $('lang');
  select.setAttribute('aria-label', t('language'));
  select.replaceChildren(...languages.map((code) => {
    const option = el('option', '', languageLabel(code));
    option.value = code;
    return option;
  }));
  select.value = lang;
  select.addEventListener('change', () => {
    try {
      localStorage.setItem(LANG_KEY, select.value);
    } catch {
      // Without storage the choice can't survive the reload, so it just reverts.
    }
    location.reload();
  });
}

function localisedCountryName(code, fallback, names) {
  try {
    return names.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

// Capital names are prepared for the five hand-written languages; others stay in English.
async function loadCapitalNames() {
  const res = await fetch(`data/capitals/${lang}.json`);
  if (!res.ok) return;
  const names = await res.json();
  for (const [iso2, name] of Object.entries(names)) {
    const country = state.byIso.get(iso2);
    if (country) country.capitalName = name;
  }
  if (state.selected) $('panel-capital').textContent = state.selected.capitalName;
}

async function start() {
  await setUpLanguage();
  const [countries, world, topojson] = await Promise.all([
    fetch('data/countries.json').then((r) => r.json()),
    fetch('vendor/world.json').then((r) => r.json()),
    loadTopojson(),
  ]);
  const regionNames = new Intl.DisplayNames([lang], { type: 'region' });
  for (const c of countries) {
    c.displayName = lang === 'en' ? c.name : localisedCountryName(c.iso2, c.name, regionNames);
    c.capitalName = c.capital;
  }
  state.countries = countries;
  state.byIso = new Map(countries.map((c) => [c.iso2, c]));

  const { features } = topojson.feature(world, world.objects.countries);
  const featureFor = (country) => features.find((f) => (country.ccn3 && String(f.id) === country.ccn3) || (country.iso2 === 'XK' && f.properties.name === 'Kosovo'));

  globe = new Globe($('globe'), { features, featureFor, countries });
  globe.addEventListener('capitalclick', ({ detail }) => openCountry(detail));
  globe.addEventListener('emptyclick', () => { if (state.selected && innerWidth <= 640) closePanel(); });
  $('panel-close').addEventListener('click', closePanel);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected) closePanel(); });
  window.addEventListener('resize', () => {
    if (state.selected) applyPanelInset();
  });
  bindTooltip();
  bindSheetSwipe();
  bindSearch();

  startCheckingForNews();
  setInterval(expireDots, 60_000);
  loadCapitalNames().catch(() => {}); // English names stay if this fails.
  if (new URLSearchParams(location.search).has('demo')) runDemo();
  window.econfo = { state, openCountry };
}

start().catch((err) => {
  console.error(err);
  $('fatal-text').textContent = /webgl/i.test(err.message) ? t('fatalWebgl') : t('fatalData');
  $('fatal').hidden = false;
});
