// Where the news comes from: business and news feeds from national outlets, regional
// feeds whose stories are sorted by the country they name, and the GDELT Project.
// Google News isn't used here, because its terms only allow personal feed readers.

// Direct economic/business RSS feeds from national outlets.
export const DIRECT_FEEDS = {
  US: ['https://www.cnbc.com/id/20910258/device/rss/rss.html', 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'],
  GB: ['https://feeds.bbci.co.uk/news/business/rss.xml', 'https://www.theguardian.com/business/economics/rss'],
  FR: ['https://www.lemonde.fr/economie/rss_full.xml', 'https://services.lesechos.fr/rss/les-echos-economie.xml'],
  DE: ['https://www.tagesschau.de/wirtschaft/index~rss2.xml', 'https://www.spiegel.de/wirtschaft/index.rss', 'https://www.faz.net/rss/aktuell/wirtschaft/'],
  IT: ['https://www.ansa.it/sito/notizie/economia/economia_rss.xml', 'https://www.ilsole24ore.com/rss/economia.xml'],
  ES: ['https://e00-expansion.uecdn.es/rss/economia.xml'],
  PT: ['https://eco.sapo.pt/feed/'],
  NL: ['https://feeds.nos.nl/nosnieuwseconomie'],
  CH: ['https://www.nzz.ch/wirtschaft.rss'],
  AT: ['https://www.derstandard.at/rss/wirtschaft'],
  SE: ['https://www.svt.se/nyheter/ekonomi/rss.xml'],
  NO: ['https://e24.no/rss2/'],
  DK: ['https://www.dr.dk/nyheder/service/feeds/penge'],
  IE: ['https://www.rte.ie/feeds/rss/?index=/news/business/'],
  PL: ['https://www.bankier.pl/rss/wiadomosci.xml'],
  TR: ['https://www.dailysabah.com/rss/business'],
  RU: ['https://rssexport.rbc.ru/rbcnews/news/30/full.rss', 'https://www.kommersant.ru/RSS/section-economics.xml'],
  CN: ['https://www.scmp.com/rss/318421/feed'],
  IN: ['https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms', 'https://www.livemint.com/rss/economy'],
  PK: ['https://www.dawn.com/feeds/business'],
  MY: ['https://www.malaymail.com/feed/rss/money'],
  SG: ['https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936', 'https://www.straitstimes.com/news/business/rss.xml'],
  TH: ['https://www.bangkokpost.com/rss/data/business.xml'],
  VN: ['https://e.vnexpress.net/rss/business.rss'],
  PH: ['https://www.bworldonline.com/feed/', 'https://business.inquirer.net/feed'],
  AU: ['https://www.abc.net.au/news/feed/51892/rss.xml'],
  NZ: ['https://www.rnz.co.nz/rss/business.xml'],
  CA: ['https://www.cbc.ca/webfeed/rss/rss-business'],
  MX: ['https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml'],
  BR: ['https://g1.globo.com/rss/g1/economia/', 'https://www.infomoney.com.br/feed/', 'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml'],
  AR: ['https://www.ambito.com/rss/pages/economia.xml'],
  CO: ['https://www.portafolio.co/rss/economia.xml', 'https://www.larepublica.co/rss/economia'],
  PE: ['https://gestion.pe/arc/outboundfeeds/rss/category/economia/?outputType=xml'],
  ZA: ['https://www.moneyweb.co.za/feed/'],
  NG: ['https://businessday.ng/feed/', 'https://nairametrics.com/feed/'],
  KE: ['https://www.standardmedia.co.ke/rss/business.php'],
  GH: ['https://www.myjoyonline.com/business/feed/'],
  EG: ['https://www.dailynewsegypt.com/feed/'],
  DZ: ['https://www.algerie-eco.com/feed/'],
  ET: ['https://addisfortune.news/feed/'],
  IL: ['https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=1725'],
};

// Readable outlet names, matched against each direct feed's URL.
const OUTLET_NAMES = {
  'cnbc.com': 'CNBC', 'nytimes.com': 'The New York Times', 'dowjones.io': 'MarketWatch', 'bbci.co.uk': 'BBC News', 'theguardian.com': 'The Guardian',
  'lemonde.fr': 'Le Monde', 'lesechos.fr': 'Les Echos', 'tagesschau.de': 'Tagesschau', 'spiegel.de': 'Der Spiegel', 'faz.net': 'FAZ', 'ansa.it': 'ANSA',
  'ilsole24ore.com': 'Il Sole 24 Ore', 'expansion': 'Expansión', 'eco.sapo.pt': 'ECO', 'nos.nl': 'NOS', 'nzz.ch': 'NZZ', 'derstandard.at': 'Der Standard',
  'svt.se': 'SVT', 'e24.no': 'E24', 'dr.dk': 'DR', 'rte.ie': 'RTÉ', 'bankier.pl': 'Bankier.pl', 'dailysabah.com': 'Daily Sabah', 'rbc.ru': 'RBC',
  'kommersant.ru': 'Kommersant', 'scmp.com': 'South China Morning Post', 'economictimes': 'The Economic Times', 'livemint.com': 'Mint', 'dawn.com': 'Dawn',
  'malaymail.com': 'Malay Mail', 'channelnewsasia.com': 'CNA', 'straitstimes.com': 'The Straits Times', 'bangkokpost.com': 'Bangkok Post',
  'vnexpress.net': 'VnExpress', 'bworldonline.com': 'BusinessWorld', 'inquirer.net': 'Philippine Daily Inquirer', 'abc.net.au': 'ABC News', 'rnz.co.nz': 'RNZ',
  'cbc.ca': 'CBC', 'elfinanciero.com.mx': 'El Financiero', 'g1.globo.com': 'G1', 'infomoney.com.br': 'InfoMoney', 'agenciabrasil': 'Agência Brasil',
  'ambito.com': 'Ámbito', 'portafolio.co': 'Portafolio', 'larepublica.co': 'La República', 'gestion.pe': 'Gestión', 'moneyweb.co.za': 'Moneyweb',
  'businessday.ng': 'BusinessDay', 'nairametrics.com': 'Nairametrics', 'standardmedia.co.ke': 'The Standard', 'myjoyonline.com': 'MyJoyOnline',
  'bbci.co.uk/news/world': 'BBC News', 'aljazeera.com': 'Al Jazeera', 'africanews.com': 'Africanews', 'theafricareport.com': 'The Africa Report', 'allafrica.com': 'AllAfrica',
  'balkaninsight.com': 'Balkan Insight', 'thediplomat.com': 'The Diplomat', 'dw.com': 'DW', 'france24.com': 'France 24', 'islandsbusiness.com': 'Islands Business', 'mercopress.com': 'MercoPress',
  'rfi.fr': 'RFI', 'timesca.com': 'The Times of Central Asia', 'news.un.org': 'UN News', 'hurriyetdailynews.com': 'Hürriyet Daily News', 'df.cl': 'Diario Financiero',
  'dailynewsegypt.com': 'Daily News Egypt', 'algerie-eco.com': 'Algérie Eco', 'addisfortune.news': 'Addis Fortune', 'globes.co.il': 'Globes',
};

function outletName(url) {
  const key = Object.keys(OUTLET_NAMES).find((k) => url.includes(k));
  return key ? OUTLET_NAMES[key] : null;
}

// Names that collide with other things need extra context in the query and
// in the headline check ("Turkey" the bird, "Jordan" the person, "Georgia" the US state...).
const NAME_RULES = {
  US: { query: '"United States" OR "U.S." OR American', title: ['United States', 'U\\.S\\.', 'US', 'USA', 'American', 'America', 'Washington', 'Fed', 'Federal Reserve', 'Wall Street'] },
  GB: { query: '"United Kingdom" OR UK OR Britain OR British', title: ['United Kingdom', 'UK', 'U\\.K\\.', 'Britain', 'British', 'England', 'London', 'Bank of England'] },
  TR: { query: 'Türkiye OR "Turkish economy" OR "Turkey economy" OR Turkish', title: ['Türkiye', 'Turkiye', 'Turkish', 'Turkey', 'Ankara', 'Istanbul'] },
  GE: { query: 'Tbilisi OR "Georgian economy" OR "Georgia\'s economy" OR Georgian', title: ['Tbilisi', 'Georgian', 'Republic of Georgia'], exclude: 'Atlanta' },
  JO: { query: 'Amman OR Jordanian OR "Jordan economy"', title: ['Amman', 'Jordanian', 'Jordan'], exclude: 'Michael Jordan' },
  TD: { query: "N'Djamena OR Chadian OR \"Chad economy\"", title: ['Chad', 'Chadian', "N'Djamena"] },
  GN: { query: 'Conakry OR Guinean OR "Republic of Guinea" -Papua -Equatorial -Bissau', title: ['Conakry', 'Guinea', 'Guinean'], exclude: 'Papua|Equatorial|Bissau' },
  NE: { query: 'Niamey OR Nigerien OR "Niger economy" OR "Republic of Niger" -Nigeria', title: ['Niamey', 'Nigerien', 'Niger'] },
  CG: { query: 'Brazzaville OR "Republic of Congo" OR "Congo-Brazzaville"', title: ['Brazzaville', 'Republic of Congo', 'Republic of the Congo', 'Congo-Brazzaville'], exclude: 'Democratic Republic' },
  CD: { query: 'Kinshasa OR "DR Congo" OR DRC OR "Democratic Republic of Congo"', title: ['Kinshasa', 'DR Congo', 'DRC', 'Democratic Republic of (the )?Congo', 'Congolese'] },
  SD: { query: '"Sudan" OR Khartoum OR Sudanese -"South Sudan"', title: ['Sudan', 'Khartoum', 'Sudanese'], exclude: 'South Sudan' },
  KR: { query: '"South Korea" OR Korean OR Seoul', title: ['South Korea', 'Korea', 'Korean', 'Seoul', 'Kospi'], exclude: 'North Korea' },
  KP: { query: '"North Korea" OR DPRK OR Pyongyang', title: ['North Korea', 'DPRK', 'Pyongyang'] },
  CI: { query: '"Ivory Coast" OR "Côte d\'Ivoire" OR Ivorian OR Abidjan', title: ['Ivory Coast', "C[oô]te d['’]Ivoire", 'Ivorian', 'Abidjan'] },
  CZ: { query: 'Czech OR Czechia OR Prague', title: ['Czech', 'Czechia', 'Prague'] },
  MM: { query: 'Myanmar OR Burma OR Yangon OR Naypyidaw', title: ['Myanmar', 'Burma', 'Burmese', 'Yangon', 'Naypyidaw'] },
  AE: { query: 'UAE OR "United Arab Emirates" OR Dubai OR "Abu Dhabi" OR Emirati', title: ['UAE', 'United Arab Emirates', 'Dubai', 'Abu Dhabi', 'Emirati'] },
  CN: { query: 'China OR Chinese OR Beijing', title: ['China', 'Chinese', 'Beijing', 'Shanghai', 'PBOC', 'Yuan'] },
  JP: { query: 'Japan OR Japanese OR Tokyo OR BOJ', title: ['Japan', 'Japanese', 'Tokyo', 'BOJ', 'BoJ', 'Nikkei', 'Yen'] },
  DO: { query: '"Dominican Republic" OR Dominicana', title: ['Dominican Republic', 'Dominicana', 'Santo Domingo'] },
  DM: { query: '"Commonwealth of Dominica" OR Roseau OR "Dominica economy" OR Dominica', title: ['Dominica', 'Roseau'], exclude: 'Dominican' },
  WS: { query: 'Samoa OR Apia -"American Samoa"', title: ['Samoa', 'Samoan', 'Apia'], exclude: 'American Samoa' },
  MK: { query: '"North Macedonia" OR Skopje OR Macedonian', title: ['North Macedonia', 'Skopje', 'Macedonian'] },
  VA: { query: '"Vatican" OR "Holy See"', title: ['Vatican', 'Holy See'] },
  PS: { query: 'Palestine OR Palestinian OR Gaza OR "West Bank"', title: ['Palestine', 'Palestinian', 'Gaza', 'West Bank', 'Ramallah'] },
  VC: { query: '"Saint Vincent and the Grenadines" OR "St. Vincent" OR "St Vincent"', title: ['Saint Vincent', 'St\\.? Vincent', 'Kingstown'] },
  KN: { query: '"Saint Kitts" OR "St. Kitts" OR "St Kitts"', title: ['Saint Kitts', 'St\\.? Kitts', 'Basseterre'] },
  LC: { query: '"Saint Lucia" OR "St. Lucia" OR "St Lucia"', title: ['Saint Lucia', 'St\\.? Lucia', 'Castries'] },
  TL: { query: '"Timor-Leste" OR "East Timor" OR Dili', title: ['Timor-Leste', 'East Timor', 'Dili', 'Timorese'] },
  ST: { query: '"São Tomé" OR "Sao Tome"', title: ['S[aã]o Tom[eé]'] },
  CV: { query: '"Cabo Verde" OR "Cape Verde"', title: ['Cabo Verde', 'Cape Verde', 'Cape Verdean'] },
  SZ: { query: 'Eswatini OR Swaziland', title: ['Eswatini', 'Swaziland', 'Mbabane'] },
  BA: { query: '"Bosnia" OR Herzegovina OR Sarajevo', title: ['Bosnia', 'Bosnian', 'Herzegovina', 'Sarajevo'] },
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A regex the headline must match to count as being about this country.
export function buildTitleMatcher(country) {
  const rule = NAME_RULES[country.iso2];
  const terms = rule ? rule.title : [escapeRegex(country.name), country.demonym && escapeRegex(country.demonym), escapeRegex(country.capital)].filter(Boolean);
  const include = new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.join('|')})(?![\\p{L}\\p{N}])`, 'u');
  const exclude = rule?.exclude ? new RegExp(rule.exclude, 'i') : null;
  return (title) => include.test(title) && !(exclude && exclude.test(title));
}

// Names too common as people or words to move a story to another country.
const NOT_ROUTABLE = new Set(['JO', 'TD', 'TR', 'DM']);

// Finds where a headline names this country, or -1. Used to move stories from a
// national feed to the country they're about. Plain capitals aren't used, since
// names like Victoria or Kingston mean too many other things.
export function buildNameFinder(country) {
  if (NOT_ROUTABLE.has(country.iso2)) return () => -1;
  const rule = NAME_RULES[country.iso2];
  const terms = rule ? rule.title : [escapeRegex(country.name), country.demonym && escapeRegex(country.demonym)].filter(Boolean);
  const include = new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.join('|')})(?![\\p{L}\\p{N}])`, 'u');
  const exclude = rule?.exclude ? new RegExp(rule.exclude, 'i') : null;
  return (title) => (exclude && exclude.test(title) ? -1 : title.search(include));
}

// Business sections of national outlets, added to DIRECT_FEEDS for this version.
const MORE_BUSINESS_FEEDS = {
  JM: ['https://jamaica-gleaner.com/feed/business.xml', 'https://www.jamaicaobserver.com/category/business/feed/'],
  BB: ['https://barbadostoday.bb/category/business/feed/'],
  TR: ['https://www.hurriyetdailynews.com/rss/economy'],
  CL: ['https://www.df.cl/noticias/site/list/port/rss.xml'],
};

// General news from national outlets: only headlines about the economy are kept.
const NATIONAL_GENERAL_FEEDS = {
  AL: ['https://www.tiranatimes.com/?feed=rss2'], AZ: ['https://report.az/en/rss/'], BH: ['https://www.newsofbahrain.com/rss.xml'], BZ: ['https://www.breakingbelizenews.com/feed/'],
  CR: ['https://ticotimes.net/feed'], CU: ['https://www.14ymedio.com/rss/', 'https://diariodecuba.com/rss.xml'], CY: ['https://cyprus-mail.com/feed/'], DZ: ['https://www.tsa-algerie.com/feed/'],
  EE: ['https://news.err.ee/rss'], FJ: ['https://www.fbcnews.com.fj/feed/'], GE: ['https://civil.ge/feed'], GT: ['https://www.prensalibre.com/feed/'], HR: ['https://total-croatia-news.com/feed/'],
  HT: ['https://www.haitilibre.com/rss-flash-en.xml'], HU: ['https://dailynewshungary.com/feed/'], IL: ['https://www.timesofisrael.com/feed/'], IR: ['https://www.iranintl.com/en/feed'], IS: ['https://grapevine.is/feed/'],
  KH: ['https://www.khmertimeskh.com/feed/'], KW: ['https://timeskuwait.com/feed/'], KZ: ['https://astanatimes.com/feed/'], LA: ['https://laotiantimes.com/feed/'], LB: ['https://www.naharnet.com/tags/lebanon/en/feed.atom'],
  LV: ['https://eng.lsm.lv/rss/'], LU: ['https://luxtimes.lu/rss'], MA: ['https://en.hespress.com/feed'], MM: ['https://www.irrawaddy.com/feed'], MZ: ['https://clubofmozambique.com/feed/'], NA: ['https://www.namibian.com.na/feed/'],
  NI: ['https://confidencial.digital/feed/'], PG: ['https://www.postcourier.com.pg/feed/'], RU: ['https://www.themoscowtimes.com/rss/news'], SD: ['https://www.dabangasudan.org/en/feed'], SK: ['https://spectator.sme.sk/rss'],
  TN: ['https://www.leconomistemaghrebin.com/feed/'], UA: ['https://kyivindependent.com/news-archive/rss/'], UZ: ['https://daryo.uz/en/feed'], ZM: ['https://www.lusakatimes.com/feed/'],
};

// Regional and world news: a story only counts if its headline names a country.
const REGIONAL_FEEDS = [
  'https://www.africanews.com/feed/rss', 'https://www.theafricareport.com/feed/', 'https://allafrica.com/tools/headlines/rdf/business/headlines.rdf', 'https://www.aljazeera.com/xml/rss/all.xml',
  'https://balkaninsight.com/feed/', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', 'https://feeds.bbci.co.uk/news/world/asia/rss.xml',
  'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml', 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', 'https://thediplomat.com/feed/', 'https://rss.dw.com/rdf/rss-en-bus',
  'https://www.france24.com/en/business/rss', 'https://www.france24.com/fr/%C3%A9co-tech/rss', 'https://www.theguardian.com/world/rss', 'https://islandsbusiness.com/feed/', 'https://en.mercopress.com/rss',
  'https://www.rfi.fr/fr/afrique/rss', 'https://www.rnz.co.nz/rss/pacific.xml', 'https://timesca.com/feed/', 'https://news.un.org/feed/subscribe/en/news/topic/economic-development/feed/rss.xml',
];

export function allFeeds() {
  const feeds = [];
  const national = (lists, trusted) => {
    for (const [iso2, urls] of Object.entries(lists)) {
      for (const url of urls) feeds.push({ id: `d:${url}`, url, iso2, trusted, sourceName: outletName(url) });
    }
  };
  national(DIRECT_FEEDS, true);
  national(MORE_BUSINESS_FEEDS, true);
  national(NATIONAL_GENERAL_FEEDS, false);
  for (const url of REGIONAL_FEEDS) feeds.push({ id: `r:${url}`, url, iso2: null, trusted: false, sourceName: outletName(url) });
  return feeds;
}

// GDELT's name for a country as its sourcecountry search expects it.
const GDELT_NAMES = {
  BS: 'bahamas', BA: 'bosniaherzegovina', CZ: 'czechrepublic', CD: 'democraticrepublicofthecongo', SZ: 'swaziland', CI: 'cotedivoire', MK: 'macedonia',
  PS: 'westbank', CG: 'congo', ST: 'saotomeandprincipe', TL: 'easttimor', TR: 'turkey', US: 'unitedstates', GB: 'unitedkingdom',
};

export function gdeltName(country) {
  return GDELT_NAMES[country.iso2] ?? country.name.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase();
}
