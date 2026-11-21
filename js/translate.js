// Translates text from the visitor's own browser and remembers the results on their
// device, so each visitor only uses their own share of the translation service.
// The service is unofficial and can refuse: callers then keep the original text.
const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const CONCURRENCY = 3;
const SPACING_MS = 200;
const REFUSED_PAUSE_MS = 5 * 60_000;
const MAX_REMEMBERED = 1500;
const SAVE_DELAY_MS = 1500;

let lang = 'en';
let memory = new Map();
let pausedUntil = 0;
let lastStart = 0;
let active = 0;
let saveTimer = null;
const queue = [];
const inFlight = new Map();

const storageKey = () => `econfo.translations.${lang}`;

export function setTranslationLanguage(code) {
  lang = code;
  try {
    memory = new Map(Object.entries(JSON.parse(localStorage.getItem(storageKey())) ?? {}));
  } catch {
    memory = new Map(); // Blocked storage only means translating again next visit.
  }
}

function remember(text, out) {
  memory.set(text, out);
  if (memory.size > MAX_REMEMBERED) memory.delete(memory.keys().next().value);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(Object.fromEntries(memory)));
    } catch {
      // Storage full or blocked: translations last for this visit only.
    }
  }, SAVE_DELAY_MS);
}

async function request(text, from) {
  const params = new URLSearchParams({ client: 'gtx', sl: from, tl: lang === 'fil' ? 'tl' : lang, dt: 't', q: text });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const out = body?.[0]?.map((segment) => segment?.[0] ?? '').join('').trim();
  if (!out) throw new Error('empty translation');
  return out;
}

function pump() {
  while (queue.length && active < CONCURRENCY) {
    if (Date.now() < pausedUntil) {
      for (const job of queue.splice(0)) job.finish(job.text, false);
      return;
    }
    const wait = lastStart + SPACING_MS - Date.now();
    if (wait > 0) {
      setTimeout(pump, wait);
      return;
    }
    lastStart = Date.now();
    const job = queue.shift();
    active++;
    request(job.text, job.from)
      .then((out) => job.finish(out, true))
      .catch(() => {
        // A refusal reaches the browser as a failed request, so any failure means wait.
        pausedUntil = Date.now() + REFUSED_PAUSE_MS;
        job.finish(job.text, false);
      })
      .finally(() => {
        active--;
        pump();
      });
  }
}

// Never rejects. On failure it resolves to the original text.
export function translate(text, { from = 'auto' } = {}) {
  if (memory.has(text)) return Promise.resolve(memory.get(text));
  if (inFlight.has(text)) return inFlight.get(text);
  const promise = new Promise((resolve) => {
    queue.push({
      text,
      from,
      finish: (out, ok) => {
        if (ok) remember(text, out);
        inFlight.delete(text);
        resolve(out);
      },
    });
  });
  inFlight.set(text, promise);
  pump();
  return promise;
}
