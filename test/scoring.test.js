import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreArticle, levelFor, isRelevant } from '../collector/scoring.js';
import { parseFeed } from '../collector/rss.js';
import { buildNameFinder, buildTitleMatcher } from '../collector/sources.js';
import { normaliseLanguage } from '../collector/i18n.js';

const level = (title, iso2 = 'FR', source = '') => levelFor(scoreArticle({ title, iso2, source }));

test('colour bands follow the brief exactly', () => {
  assert.deepEqual([0.5, 2, 2.1, 4, 4.1, 6, 6.1, 8, 8.1, 10].map(levelFor), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

const IRAN = 'Oil prices surge 60% as US and Israel strikes on Iran trigger global energy crisis';

test('10/10 is reserved for a corroborated international crisis', () => {
  assert.equal(scoreArticle({ title: IRAN, iso2: 'US' }, { crisisCountries: 30 }), 10);
  assert.equal(levelFor(scoreArticle({ title: IRAN, iso2: 'FR' }, { crisisCountries: 12 })), 5);
  assert.equal(levelFor(scoreArticle({ title: 'Crise financière mondiale : les marchés mondiaux plongent' }, { crisisCountries: 4 })), 5);
});

test('crisis wording alone, without corroboration, stays out of the top band', () => {
  assert.equal(levelFor(scoreArticle({ title: IRAN, iso2: 'US' }, { crisisCountries: 1 })), 4);
});

test('one country in crisis never reaches the top band', () => {
  for (const [title, iso2] of [
    ['Argentina defaults on its debt as financial crisis deepens', 'AR'],
    ['Paraguay bank collapses with half of population savings', 'PY'],
    ['Historic record crash: financial crisis, recession, $5 trillion lost, inflation 90%', 'US'],
    ["Iran's Currency Crisis: Record-low rial deepens pressure on households", 'IR'],
  ]) {
    const s = scoreArticle({ title, iso2, source: 'Reuters' }, { crisisCountries: 30 });
    assert.ok(s <= 8, title);
    assert.equal(levelFor(s), 4, title);
  }
});

test('warnings about a global crisis are not a global crisis', () => {
  assert.equal(levelFor(scoreArticle({ title: "France's debt crisis could trigger a global recession", iso2: 'FR' }, { crisisCountries: 30 })) < 5, true);
  assert.equal(levelFor(scoreArticle({ title: 'Opinion: the global financial crisis is coming', iso2: 'US' }, { crisisCountries: 30 })) < 3, true);
});

test('routine macro news is mid-scale, not alarming', () => {
  assert.equal(level('Central bank raises interest rates by 50 basis points', 'BR'), 3);
  assert.equal(level('La Banque centrale maintient ses taux directeurs'), 3);
  assert.equal(level('Inflation climbs to 7% as consumer prices rise', 'KE'), 3);
});

test('a recession in a large economy is major', () => {
  assert.equal(level('Economy enters recession after two quarters of decline', 'DE'), 4);
});

test('company news sits below macro news', () => {
  const company = scoreArticle({ title: 'Local retailer reports quarterly profits', iso2: 'KE' });
  const macro = scoreArticle({ title: 'Inflation climbs to 7% as consumer prices rise', iso2: 'KE' });
  assert.ok(company < macro);
  assert.equal(levelFor(company), 2);
});

test('opinion and how-to pieces stay low even with dramatic words', () => {
  assert.ok(level('Opinion: why the recession will be the worst ever', 'US') <= 2);
  assert.ok(level('Best savings rates this week: what to know', 'US') <= 2);
});

test('larger economies weigh more for the same event', () => {
  const big = scoreArticle({ title: 'GDP growth slows', iso2: 'US' });
  const small = scoreArticle({ title: 'GDP growth slows', iso2: 'TV' });
  assert.ok(big > small);
});

test('headlines with no economic signal are minor', () => {
  assert.equal(level('Nigerian designer builds STZ. into streetwear with African roots', 'NG'), 1);
});

test('score stays within range', () => {
  assert.ok(scoreArticle({ title: IRAN, iso2: 'US', source: 'Reuters' }, { crisisCountries: 99 }) <= 10);
  assert.ok(scoreArticle({ title: 'Podcast', iso2: 'TV' }) >= 0.5);
});

test('routing finds the country a headline is really about', () => {
  const paraguay = buildNameFinder({ iso2: 'PY', name: 'Paraguay', demonym: 'Paraguayan' });
  assert.equal(paraguay('Paraguay bank collapses'), 0);
  assert.equal(paraguay('Bank collapses in Ghana'), -1);
  const seychelles = buildNameFinder({ iso2: 'SC', name: 'Seychelles', demonym: 'Seychellois' });
  assert.equal(seychelles('Victoria budget passes in Australia'), -1); // Capitals are too ambiguous to route on.
});

test('browser locales map to supported languages', () => {
  assert.equal(normaliseLanguage('fr-CH'), 'fr');
  assert.equal(normaliseLanguage('zh-HK'), 'zh-TW');
  assert.equal(normaliseLanguage('zh-CN'), 'zh-CN');
  assert.equal(normaliseLanguage('nb-NO'), 'no');
  assert.equal(normaliseLanguage('xx-YY'), null);
  assert.equal(normaliseLanguage(undefined), null);
});

test('off-topic headlines are rejected', () => {
  assert.equal(isRelevant('France beat Spain in World Cup thriller'), false);
  assert.equal(isRelevant('Nice weather for a walk'), false);
  assert.equal(isRelevant('French exports rise in September'), true);
  assert.equal(isRelevant('Le ministre visite une usine', { trustedFeed: true }), true);
});

test('headline matcher avoids name collisions', () => {
  const niger = buildTitleMatcher({ iso2: 'NE', name: 'Niger', capital: 'Niamey' });
  assert.equal(niger('Nigeria inflation hits 30%'), false);
  assert.equal(niger('Niger uranium exports resume'), true);
  const sudan = buildTitleMatcher({ iso2: 'SD', name: 'Sudan', capital: 'Khartoum' });
  assert.equal(sudan('South Sudan oil exports stop'), false);
  const france = buildTitleMatcher({ iso2: 'FR', name: 'France', demonym: 'French', capital: 'Paris' });
  assert.equal(france('French budget passes'), true);
  assert.equal(france('Germany budget passes'), false);
});

test('feed parser handles RSS, Atom, and strips the Google source suffix', () => {
  const rss = `<rss version="2.0"><channel><title>Feed</title><item><title>Inflation falls - Reuters</title><link>https://example.com/a</link><pubDate>Thu, 05 Nov 2026 10:00:00 GMT</pubDate><source url="https://reuters.com">Reuters</source></item><item><title>Bad link</title><link>javascript:alert(1)</link><pubDate>Thu, 05 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
  const items = parseFeed(rss);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Inflation falls');
  assert.equal(items[0].source, 'Reuters');

  const atom = `<feed><title>A</title><entry><title>GDP up</title><link rel="alternate" href="https://example.com/b"/><updated>2026-11-05T10:00:00Z</updated></entry></feed>`;
  assert.equal(parseFeed(atom)[0].url, 'https://example.com/b');
});
