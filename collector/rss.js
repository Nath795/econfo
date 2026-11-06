// Fetches and normalises RSS 2.0, RDF and Atom feeds into plain article objects.
import { XMLParser } from 'fast-xml-parser';

const USER_AGENT = 'Mozilla/5.0 (compatible; econfo/1.0; personal news reader)';
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: false,
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
});

export class FeedError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function asArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function text(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return text(v['#text']);
  return String(v);
}

function cleanText(s) {
  return text(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160);/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function safeUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

function atomLink(link) {
  const links = asArray(link);
  const best = links.find((l) => typeof l === 'object' && (l['@_rel'] === 'alternate' || !l['@_rel'])) ?? links[0];
  return typeof best === 'object' ? best?.['@_href'] : best;
}

function hostLabel(url) {
  try {
    return new URL(url).hostname.replace(/^(www|feeds?|rss|services|e|en|rssexport)\./, '');
  } catch {
    return 'Unknown source';
  }
}

export function parseFeed(xml) {
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  const rdf = doc?.['rdf:RDF'];
  const atom = doc?.feed;
  const channelTitle = cleanText(channel?.title ?? rdf?.channel?.title ?? atom?.title);
  const raw = asArray(channel?.item ?? rdf?.item ?? atom?.entry);
  if (!channel && !rdf && !atom) throw new FeedError('Not a recognised feed format');

  const items = [];
  for (const it of raw) {
    let title = cleanText(it.title);
    const url = safeUrl(it.link && typeof it.link === 'object' ? atomLink(it.link) : text(it.link) || it.guid);
    const date = text(it.pubDate ?? it['dc:date'] ?? it.published ?? it.updated);
    const published = date ? Date.parse(date) : NaN;
    if (!title || !url || Number.isNaN(published)) continue;

    let source = cleanText(it.source);
    // Google News appends " - Source" to every headline.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    if (!source) source = channelTitle && channelTitle.length < 50 ? channelTitle : hostLabel(url);
    title = title.replace(/\s+By Investing\.com$/i, '');
    items.push({ title, url, source, published, summary: cleanText(it.description ?? it.summary).slice(0, 400) });
  }
  return items;
}

export async function fetchFeed(url, { etag, lastModified } = {}) {
  const headers = { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' };
  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;

  const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 304) return { notModified: true };
  if (!res.ok) throw new FeedError(`HTTP ${res.status}`, res.status);
  const declared = Number(res.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) throw new FeedError('Feed too large');
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new FeedError('Feed too large');
  return { items: parseFeed(body), etag: res.headers.get('etag'), lastModified: res.headers.get('last-modified') };
}
