// Estimates a headline's economic impact from 0 to 10. This is a rule-based
// estimate, not a model: topic sets the base, then size, tone, source and the
// size of the country's economy adjust it. The number is never shown to users.
//
// The scale is deliberately strict. One country's trouble tops out at 8. Above that
// is reserved for international crises, and needs both crisis wording and many
// countries reporting it at once. The benchmark for 10 is the shock of February
// 2026, when strikes on Iran sent oil up by more than 60%.

const WORD_START = '(?<![\\p{L}\\p{N}])';

// Latin-script words match from a word start, so "récession" also covers "récessions".
// Scripts without spaces (Chinese, Japanese, Thai) match anywhere.
function rx(terms) {
  const latin = [];
  const anywhere = [];
  for (const t of terms) (/[฀-๿぀-ヿ一-鿿가-힯]/.test(t) ? anywhere : latin).push(t);
  const parts = [];
  if (latin.length) parts.push(`${WORD_START}(?:${latin.join('|')})`);
  if (anywhere.length) parts.push(`(?:${anywhere.join('|')})`);
  return new RegExp(parts.join('|'), 'iu');
}

// Highest weight wins. Each tier lists terms in the main languages of the feeds.
const TOPICS = [
  // Systemic shocks
  { w: 6.8, re: rx([
    'sovereign default', 'defaults? on (?:its )?(?:debt|bonds?)', 'debt default', 'hyperinflation', 'financial crisis', 'economic crisis', 'economic collapse',
    'currency crisis', 'debt crisis', 'banking crisis', 'bank run', 'market crash', 'stock market crash', 'bank(?:ing)? collapse', 'bailout', 'imf bailout', 'economic emergency',
    'défaut de paiement', 'crise (?:financière|économique|bancaire|de la dette)', 'hyperinflation', 'krach', 'renflouement', 'plan de sauvetage',
    'crisis (?:económica|financiera|bancaria|de deuda)', 'impago', 'hiperinflaci[oó]n', 'rescate financiero', 'crise (?:econômica|financeira|bancária)', 'hiperinflação', 'calote',
    'finanzkrise', 'wirtschaftskrise', 'bankenkrise', 'staatspleite', 'börsencrash', 'crisi (?:economica|finanziaria|bancaria)', 'экономический кризис', 'финансовый кризис', 'дефолт', 'гиперинфляц',
    'أزمة اقتصادية', 'أزمة مالية', '金融危机', '经济危机', '債務不履行', '金融危機', '経済危機', '경제 위기', '금융 위기', 'ekonomik kriz', 'kryzys (?:gospodarczy|finansowy)',
  ]) },
  // National-scale events
  { w: 5.6, re: rx([
    'recession', 'economic contraction', 'economy (?:shrinks|contracts|shrank|contracted)', 'gdp (?:shrinks|contracts|falls|shrank|contracted)', 'devalu', 'credit rating', '(?:rating|debt) downgrade', 'downgrades?', 'moody', 'fitch', 's&p global ratings', 'imf (?:loan|deal|programme|program|agreement|package)',
    'economic sanctions', 'sanctions', 'trade war', 'capital controls', 'stagflation', 'nationali[sz]', 'oil embargo',
    'récession', 'dévaluation', 'dégradation de la note', 'note souveraine', 'sanctions économiques', 'guerre commerciale', 'stagflation',
    'recesi[oó]n', 'devaluaci[oó]n', 'calificaci[oó]n crediticia', 'guerra comercial', 'sanciones', 'recessão', 'desvalorização', 'guerra comercial', 'sanções',
    'rezession', 'abwertung', 'handelskrieg', 'sanktionen', 'recessione', 'svalutazione', 'guerra commerciale', 'sanzioni', 'recessie', 'рецесси', 'девальвац', 'санкци', 'торговая война',
    'ركود', 'خفض قيمة', 'عقوبات', '衰退', '贸易战', '制裁', '景気後退', '貿易戦争', '경기 침체', '무역 전쟁', 'resesyon', 'devalüasyon', 'yaptırım', 'recesja', 'sankcje',
  ]) },
  // Headline macro: rates, prices, growth, fiscal, trade policy
  { w: 4.4, re: rx([
    '(?:stocks?|shares|markets?|wall street|bourse|bolsa|borsa|börse)[^.]{0,30}(?:worst|plunge|plummet|tumble|crash|sell-?off|rout|sharply)', 'tonfo', 'central bank', 'interest rates?', 'rate (?:cut|hike|decision|rise)s?', 'cuts? rates?', 'raises? rates?', 'hikes? rates?', 'federal reserve', '(?:the )?fed\\b', 'ecb', 'bank of (?:england|japan|canada|korea)', 'rbi', 'pboc', 'monetary policy', 'repo rate', 'policy rate',
    'inflation', 'consumer prices?', 'cpi', 'gdp', 'economic growth', 'national budget', 'state budget', 'federal budget', 'budget deficit', 'fiscal deficit', 'national debt', 'public debt', 'government debt', 'tariffs?', 'trade deal', 'trade agreement', 'trade deficit', 'trade surplus', 'government shutdown', 'austerity', 'stimulus',
    'banque centrale', 'taux directeurs?', "taux d'intérêt", 'politique monétaire', 'pib', 'croissance économique', 'budget de l.[ée]tat', 'projet de loi de finances', 'déficit public', 'dette publique', 'droits de douane', 'accord commercial', 'austérité',
    'banco central', 'tasas? de interés', 'tipos? de interés', 'taxa selic', 'selic', 'pol[ií]tica monetaria', 'inflaci[oó]n', 'inflação', 'crecimiento económico', 'presupuesto', 'orçamento', 'déficit fiscal', 'deuda pública', 'dívida pública', 'aranceles', 'tarifas', 'acuerdo comercial', 'copom', 'banxico',
    'zentralbank', 'leitzins', 'ezb', 'bundesbank', 'inflation', 'bruttoinlandsprodukt', 'bip', 'haushalt', 'staatsschulden', 'zölle', 'handelsabkommen',
    'banca centrale', 'tassi di interesse', 'inflazione', 'debito pubblico', 'manovra', 'dazi', 'centrale bank', 'rente', 'begroting', 'staatsschuld',
    'центробанк', 'ключевая ставка', 'ключевую ставку', 'инфляц', 'ввп', 'бюджет', 'госдолг', 'пошлин',
    'البنك المركزي', 'سعر الفائدة', 'التضخم', 'الناتج المحلي', 'الموازنة', 'الدين العام', 'الرسوم الجمركية',
    '央行', '利率', '通胀', 'CPI', 'GDP', '财政', '关税', '日銀', '金利', '物価', 'インフレ', '予算', '関税', '한국은행', '금리', '인플레이션', '물가', '예산', '관세',
    'merkez bankası', 'faiz', 'enflasyon', 'bütçe', 'gümrük', 'bank centralny', 'stopy procentowe', 'inflacja', 'budżet', 'cła', 'riksbank', 'norges bank', 'inflasi', 'suku bunga',
  ]) },
  // Labour, external accounts, large-scale investment, commodities, markets
  { w: 3.0, re: rx([
    'unemployment', 'jobless', 'job losses', 'layoffs?', 'payrolls', 'jobs report', 'labou?r market', 'minimum wage', 'exports?', 'imports?', 'current account', 'foreign direct investment', 'fdi', 'foreign reserves', 'forex reserves', 'remittances?', 'exchange rate', 'currency', 'crude', 'oil (?:price|output|production)', 'opec', 'stock market', 'stocks? (?:fall|drop|sink|slide|rise|plunge|surge|tumble|rally)', 'wall street', 'bond yields?', 'treasury yields?', 'sovereign wealth', 'privati[sz]', 'merger', 'acquisition', 'taxes', 'tax (?:reform|hike|cut|bill)', 'strike', 'economy', 'economic',
    'chômage', 'emploi', 'licenciements?', 'salaire minimum', 'smic', 'exportations?', 'importations?', 'balance commerciale', 'investissements? étrangers?', 'taux de change', 'bourse', 'cac 40', 'impôts?', 'réforme fiscale', 'grève', 'économie', 'économique',
    'desempleo', 'empleo', 'despidos', 'salario m[ií]nimo', 'exportaciones', 'importaciones', 'inversi[oó]n extranjera', 'tipo de cambio', 'd[oó]lar', 'bolsa', 'impuestos', 'econom[ií]a', 'económico', 'desemprego', 'emprego', 'exportações', 'câmbio', 'ibovespa', 'impostos', 'econômico',
    'arbeitslos', 'stellenabbau', 'mindestlohn', 'exporte?', 'importe?', 'wechselkurs', 'dax', 'steuern', 'wirtschaft', 'streik', 'disoccupazione', 'occupazione', 'esportazioni', 'borsa', 'tasse', 'economia', 'werkloosheid', 'economie', 'export',
    'безработиц', 'экспорт', 'импорт', 'курс рубля', 'нефт', 'биржа', 'налог', 'экономик',
    'البطالة', 'الصادرات', 'الواردات', 'سعر الصرف', 'النفط', 'البورصة', 'الضرائب', 'الاقتصاد', 'اقتصاد',
    '失业', '就业', '出口', '进口', '汇率', '股市', '经济', '失業', '雇用', '輸出', '輸入', '為替', '株価', '経済', '실업', '고용', '수출', '수입', '환율', '증시', '경제',
    'işsizlik', 'ihracat', 'ithalat', 'borsa', 'vergi', 'ekonomi', 'bezrobocie', 'eksport', 'giełda', 'podatki', 'gospodarka', 'ekonomi', 'arbetslöshet', 'økonomi', 'talous', 'gazdaság', 'ekonomika', 'kinh tế', 'เศรษฐกิจ',
  ]) },
  // Company, sector and local business news
  { w: 2.2, re: rx([
    'earnings', 'profits?', 'revenue', 'quarterly results', 'ipo', 'shares', 'investment', 'investors?', 'startup', 'bank', 'banking', 'business', 'industry', 'manufacturing', 'retail', 'housing', 'mortgage', 'real estate', 'tourism', 'agriculture', 'mining', 'energy', 'finance', 'financial', 'loan', 'debt', 'budget', 'trade', 'market', 'company', 'funding', 'partnership', 'factory',
    'bénéfices?', "chiffre d'affaires", 'résultats', 'investissement', 'entreprises?', 'banque', 'industrie', 'immobilier', 'tourisme', 'marché', 'finances?', 'dette', 'commerce',
    'ganancias', 'beneficios', 'inversi[oó]n', 'empresas?', 'banco', 'industria', 'vivienda', 'turismo', 'mercado', 'lucro', 'investimento', 'indústria', 'gewinn', 'umsatz', 'unternehmen', 'investition', 'industrie', 'immobilien', 'markt', 'utile', 'investimenti', 'azienda', 'mercato',
    'прибыль', 'инвестиц', 'банк', 'рынок', 'компани', 'الاستثمار', 'بنك', 'شركة', 'السوق', '投资', '企业', '银行', '市场', '投資', '企業', '銀行', '市場', '투자', '기업', '은행', '시장', 'yatırım', 'şirket', 'banka', 'piyasa', 'inwestycje', 'firma', 'rynek',
  ]) },
];

// Words that make an event bigger or more abrupt than its topic alone.
const SEVERE = rx([
  'plunges?', 'plummets?', 'collapses?', 'crash(?:es)?', 'soars?', 'surges?', 'skyrockets?', 'tumbles?', 'slumps?', 'record[- ](?:high|low)', 'all-time (?:high|low)', 'historic', 'unprecedented', 'emergency', 'worst', 'biggest', 'highest in', 'lowest in', 'massive', 'shock', 'turmoil', 'panic', 'freefall', 'meltdown',
  'chute', 'effondrement', "s'effondre", 'bondit', 'flambée', 'historique', 'record', "d'urgence", 'plonge', 'desplome', 'se dispara', 'hist[oó]rico', 'histórica', 'emergencia', 'despenca', 'dispara', 'emergência', 'bricht ein', 'stürzt', 'historisch', 'rekord', 'crollo', 'storico', 'обвал', 'рекорд', 'рухнул', 'انهيار', 'قياسي', '暴跌', '暴落', '폭락', 'rekor', 'tarihi',
]);

const BIG_MONEY = /(?:[$€£¥]\s?\d[\d.,]*\s?(?:bn|billion|trillion|tn)\b)|(?:\b\d[\d.,]*\s?(?:billion|trillion|bn|milliards?|billones|mil millones|bilh(?:ão|ões)|trilh(?:ão|ões)|Milliarden|miliardi|млрд|трлн)(?![\p{L}]))/iu;
const BIG_PERCENT = /\b(\d{1,3}(?:[.,]\d+)?)\s?(?:%|percent|per cent|pour cent|por ciento|por cento|prozent)/iu;

// Reads that inform but rarely move an economy.
const SOFT = rx([
  'opinion', 'op-ed', 'editorial', 'analysis:', 'commentary', 'podcast', 'interview', 'explainer', 'how to', 'what to know', 'what is', 'why you', 'things to', 'tips', 'guide to', 'review:', 'column', 'letters?:', 'quiz', 'watch:', 'video:',
  'best (?:stocks?|savings|credit|mortgage|cd|etf)', 'stocks? to (?:buy|watch)', 'forum', 'webinar', 'workshop', 'seminar', 'conference', 'summit opens', 'award', 'wins award', 'scholarship', 'appoint', 'named ceo',
  'tribune', 'chronique', 'entretien', 'comment ', 'pourquoi', 'tribuna', 'columna', 'entrevista', 'cómo', 'por qué', 'kommentar', 'interview:', 'wie ', 'коммента', 'мнение', 'رأي',
]);

// Speculative wording: a forecast matters less than the event itself.
const SPECULATIVE = rx(['could', 'may ', 'might', 'would', 'fears?', 'risks?', 'if ', 'expected to', 'could trigger', 'forecasts?', 'outlook', 'warns?', 'predicts?', 'pourrait', 'prévision', 'podr[ií]a', 'previsión', 'pode ', 'könnte', 'prognose', 'potrebbe', 'может', 'прогноз', 'قد ']);

// Clearly off-topic headlines that a loose query or a general feed lets through.
const OFF_TOPIC = rx([
  'football', 'soccer', 'cricket', 'basketball', 'olympic', 'world cup', 'premier league', 'champions league', 'nba', 'nfl', 'tennis', 'golf', 'rugby', 'formula 1', 'movie', 'film review', 'box office', 'celebrity', 'horoscope', 'recipe', 'wedding', 'fashion week', 'concert', 'album', 'match report', 'kardashian',
]);

// Crises that reach beyond one country, in the main languages of the feeds.
const INTERNATIONAL_CRISIS = rx([
  'global (?:financial|economic|energy|oil|debt|banking|food|supply|market) (?:crisis|shock|meltdown)', 'global (?:recession|depression)', 'worldwide (?:recession|depression|crisis)', 'world economy[^.]{0,40}(?:shock|crisis|plunge|tumble|reel)', 'global economy[^.]{0,40}(?:shock|crisis|plunge|tumble|reel)',
  'global (?:markets?|stocks?)[^.]{0,30}(?:plunge|plummet|crash|rout|sell-?off|tumble|turmoil|meltdown)', 'markets? worldwide[^.]{0,30}(?:plunge|crash|tumble)', 'oil shock', 'energy shock', 'financial contagion', 'largest supply disruption', 'hormuz[^.]{0,40}(?:clos|shut|block)', '(?:clos|shut|block)[^.]{0,40}hormuz',
  '(?:oil|brent|crude|energy|fuel)[^.]{0,50}(?:surge|soar|spike|jump|skyrocket|record)[^.]{0,50}(?:war|strikes?|attacks?|blockade|invasion|conflict)',
  '(?:war|strikes?|attacks?|blockade|invasion|conflict)[^.]{0,50}(?:oil|brent|crude|energy|global markets?|world economy|global economy)[^.]{0,50}(?:surge|soar|spike|jump|plunge|tumble|crash|shock|rout)',
  'crise (?:économique |financière |énergétique |pétrolière )?(?:mondiale|internationale)', 'récession mondiale', 'choc pétrolier', 'choc énergétique', 'détroit d.ormuz[^.]{0,40}(?:ferm|bloqu)', 'marchés mondiaux[^.]{0,30}(?:plonge|chut|krach|effondr)',
  'crisis (?:económica |financiera |energética |petrolera )?(?:mundial|global|internacional)', 'recesi[oó]n (?:mundial|global)', 'shock petrolero', 'estrecho de ormuz[^.]{0,40}(?:cierr|bloque)', 'mercados (?:mundiales|globales)[^.]{0,30}(?:desplom|caen|hunden)',
  'crise (?:econômica |financeira |energética )?(?:mundial|global|internacional)', 'recessão (?:mundial|global)', 'choque do petróleo', 'estreito de ormuz[^.]{0,40}(?:fech|bloque)',
  'weltwirtschaftskrise', 'globale (?:finanzkrise|rezession|wirtschaftskrise|energiekrise)', 'ölpreisschock', 'straße von hormus[^.]{0,40}(?:geschlossen|sperr|blockier)',
  'crisi (?:economica |finanziaria |energetica )?(?:globale|mondiale)', 'recessione (?:globale|mondiale)', 'shock petrolifero', 'stretto di hormuz[^.]{0,40}(?:chius|blocc)',
  'мировой (?:финансовый |экономический |энергетический )?кризис', 'глобальн\\S* (?:рецесси|кризис)', 'нефтяной шок', 'ормузск\\S* пролив\\S*[^.]{0,40}(?:закры|блокир)',
  'أزمة (?:اقتصادية |مالية )?عالمية', 'ركود عالمي', 'صدمة نفطية', 'إغلاق مضيق هرمز',
  'pétrole[^.]{0,40}(?:flamb|bond|s.envol|grimp)[^.]{0,40}(?:guerre|frappes?|attaques?|conflit)', '(?:guerre|frappes?|conflit)[^.]{0,40}pétrole[^.]{0,30}(?:flamb|bond|envol)',
  'petr[oó]leo[^.]{0,40}(?:dispar|sube|alza)[^.]{0,40}(?:ataques?|guerra|conflicto)', '(?:guerra|ataques?|conflicto)[^.]{0,50}(?:petr[oó]leo|crudo)[^.]{0,30}(?:dispar|sube|alza)',
  'petróleo dispara[^.]{0,40}(?:ataque|guerra|conflito)', '(?:guerra|ataque|conflito)[^.]{0,40}petróleo dispara', 'fechamento do estreito de h?ormuz',
  '(?:krieg|angriff\S*|eskalation)[^.]{0,40}(?:ölpreis|energiepreis|spritpreis|börse)', '(?:ölpreis|energiepreis)\S*[^.]{0,40}(?:krieg|eskalation|angriff)',
  'guerra[^.]{0,40}(?:petrolio|borse|gas)[^.]{0,30}(?:choc|shock|balzo|impenn)', '(?:petrolio|gas)[^.]{0,30}(?:choc|shock)[^.]{0,30}guerra', 'stretto di hormuz[^.]{0,40}navi ferme',
  'шок[^.]{0,30}цен на нефть', 'нефть[^.]{0,30}(?:дорожа|взлет)[^.]{0,30}войн', 'войн\S*[^.]{0,30}нефть[^.]{0,30}(?:дорожа|взлет)', 'закрытие ормузск',
  'حرب[^.]{0,40}(?:تشعل الأسواق|أسعار النفط)', 'مخاوف[^.]{0,30}الطاقة[^.]{0,30}الحرب',
  'savaş[^.]{0,40}petrol fiyatlar', 'saldırı[^.]{0,40}petrol fiyatlar', 'kryzys\S* cen ropy', 'globaln\S* recesj', 'atak[^.]{0,40}(?:rynek ropy|cen\S* ropy)',
  '(?:战争|冲突|打击)[^。]{0,20}(?:全球经济|原油)[^。]{0,10}(?:冲击|飙升|暴涨)', '全球经济冲击', '霍尔木兹海峡[^。]{0,10}封锁',
  '全球金融危机', '全球经济危机', '全球衰退', '石油危机', '封锁霍尔木兹', '世界恐慌', '世界金融危機', '世界同時不況', 'ホルムズ海峡封鎖', '세계 경제 위기', '글로벌 금융 위기', '호르무즈 해협 봉쇄', 'küresel (?:kriz|resesyon|ekonomik kriz)', 'hürmüz boğazı[^.]{0,40}(?:kapat|abluka)', 'globalny kryzys', 'światowy kryzys',
]);

const NO_TOPIC_SCORE = 1.4; // Headlines with no economic signal, from business feeds.
const SINGLE_COUNTRY_CAP = 8; // Anything higher has to be an international crisis.
const G2_WEIGHT = 0.6;
const G7_WEIGHT = 0.35;
const G20_WEIGHT = 0.15;
const COUNTRY_WEIGHT = {
  US: G2_WEIGHT, CN: G2_WEIGHT,
  DE: G7_WEIGHT, JP: G7_WEIGHT, GB: G7_WEIGHT, FR: G7_WEIGHT, IN: G7_WEIGHT, IT: G7_WEIGHT, CA: G7_WEIGHT,
  AR: G20_WEIGHT, AU: G20_WEIGHT, BR: G20_WEIGHT, ID: G20_WEIGHT, KR: G20_WEIGHT, MX: G20_WEIGHT, RU: G20_WEIGHT, SA: G20_WEIGHT, ZA: G20_WEIGHT, TR: G20_WEIGHT, ES: G20_WEIGHT, NL: G20_WEIGHT, CH: G20_WEIGHT,
};

// How many countries must be reporting the crisis in 24 hours for each score.
const CRISIS_LADDER = [[25, 10], [12, 9.4], [6, 8.8], [3, 8.2]];

const WIRE_SOURCES = /reuters|bloomberg|financial times|associated press|\bap\b|\bafp\b|wall street journal|\bwsj\b|the economist|\bimf\b|world bank|central bank|ministry of finance/i;

function isEconomic(title) {
  return TOPICS.some((t) => t.re.test(title));
}

// A stated crisis, not a warning that one might happen or an opinion about it.
export function isInternationalCrisis(title) {
  return INTERNATIONAL_CRISIS.test(title) && !SPECULATIVE.test(title) && !SOFT.test(title);
}

// crisisCountries: how many countries reported an international crisis around
// the same time as this article.
export function scoreArticle({ title, source = '', iso2 = '' }, { crisisCountries = 0 } = {}) {
  if (isInternationalCrisis(title)) {
    const step = CRISIS_LADDER.find(([countries]) => crisisCountries >= countries);
    return step ? step[1] : SINGLE_COUNTRY_CAP - 0.3; // Not corroborated yet.
  }

  const matches = TOPICS.filter((t) => t.re.test(title));
  let score = matches.length ? matches[0].w : NO_TOPIC_SCORE;
  if (matches.length >= 2) score += 0.2;

  if (SEVERE.test(title)) score += 0.5;
  if (BIG_MONEY.test(title)) score += /trillion|tn\b|billones|trilh|трлн/i.test(title) ? 0.5 : 0.3;
  const pct = title.match(BIG_PERCENT);
  if (pct && parseFloat(pct[1].replace(',', '.')) >= 10) score += 0.3;

  if (SPECULATIVE.test(title)) score -= 0.5;
  if (WIRE_SOURCES.test(source)) score += 0.1;
  score += COUNTRY_WEIGHT[iso2] ?? 0;

  // Soft reads cap low regardless of how dramatic the wording is.
  if (SOFT.test(title)) score = Math.min(score - 1, 2.6);

  return Math.round(Math.max(0.5, Math.min(SINGLE_COUNTRY_CAP, score)) * 10) / 10;
}

// Colour bands from the brief: <=2, <=4, <=6, <=8, up to 10.
export function levelFor(score) {
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 6) return 3;
  if (score <= 8) return 4;
  return 5;
}

// Whether a headline belongs on an economy page at all. Business feeds are
// trusted more than keyword searches, which also return sport and culture.
export function isRelevant(title, { trustedFeed = false } = {}) {
  if (OFF_TOPIC.test(title)) return false;
  return trustedFeed || isEconomic(title);
}
