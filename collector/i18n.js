// Interface text. French, Spanish, German, Portuguese and Italian are written by
// hand; other languages are machine-translated from English on first use.

export const LANGUAGES = [
  'en', 'fr', 'es', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'uk', 'tr', 'ar', 'fa', 'he', 'hi', 'bn', 'ur', 'id', 'ms', 'vi', 'th',
  'zh-CN', 'zh-TW', 'ja', 'ko', 'sv', 'no', 'da', 'fi', 'cs', 'sk', 'hu', 'ro', 'bg', 'el', 'hr', 'sr', 'sl', 'lt', 'lv', 'et', 'sw', 'am', 'af', 'fil', 'ta',
];

const ALIASES = { nb: 'no', nn: 'no', iw: 'he', tl: 'fil', in: 'id', zh: 'zh-CN' };
const TRADITIONAL = /^zh-(tw|hk|mo|hant)/i;

// Maps a browser locale such as "fr-CH" to a supported language, or null.
export function normaliseLanguage(raw) {
  if (typeof raw !== 'string' || raw.length > 20) return null;
  if (TRADITIONAL.test(raw)) return 'zh-TW';
  const exact = LANGUAGES.find((l) => l.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const base = raw.split('-')[0].toLowerCase();
  const code = ALIASES[base] ?? base;
  return LANGUAGES.includes(code) ? code : null;
}

export const UI_EN = {
  search: 'Find a country or capital',
  language: 'Language',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  live: 'Updated {time} · {n} countries',
  sources: 'Sources: national media, GDELT Project',
  minor: 'Minor',
  moderate: 'Moderate',
  notable: 'Notable',
  major: 'Major',
  critical: 'Critical',
  latest: 'Latest 20 economic stories',
  found: 'Economic stories found so far: {n}',
  loading: 'Loading',
  empty: 'No economic stories found yet. This country is being checked now, and anything found will appear here automatically.',
  offline: "Couldn't load the news. It will retry when the connection returns.",
  justNow: 'just now',
  dismiss: 'Dismiss notification',
  close: 'Close news panel',
  original: 'Original headline: {title}',
  fatalTitle: "The globe couldn't start",
  fatalWebgl: 'Your browser or graphics driver has WebGL turned off, which the 3D map needs.',
  fatalData: 'The map data could not be loaded. Check your connection, then reload the page.',
  sample1: 'Sample: local market association holds annual meeting',
  sample2: 'Sample: regional retailer reports quarterly profit',
  sample3: 'Sample: exports rise for a third month',
  sample4: 'Sample: central bank cuts its key interest rate',
  sample5: 'Sample: global financial crisis as markets crash worldwide',
};

// What gets sent for machine translation when the English label alone is ambiguous.
export const UI_MACHINE_SOURCE = {
  minor: 'Minor impact', moderate: 'Moderate impact', notable: 'Notable impact', major: 'Major impact', critical: 'Critical impact',
};

export const UI_HANDWRITTEN = {
  fr: {
    search: 'Chercher un pays ou une capitale', language: 'Langue', connecting: 'Connexion', reconnecting: 'Reconnexion',
    live: 'Mis à jour {time} · {n} pays', sources: 'Sources : médias nationaux, GDELT Project',
    minor: 'Mineur', moderate: 'Modéré', notable: 'Notable', major: 'Majeur', critical: 'Critique',
    latest: 'Les 20 dernières actualités économiques', found: 'Actualités économiques trouvées pour l’instant : {n}', loading: 'Chargement',
    empty: 'Aucune actualité économique pour l’instant. Ce pays est en cours de vérification, et tout ce qui sera trouvé apparaîtra ici automatiquement.',
    offline: 'Impossible de charger les actualités. Nouvel essai dès le retour de la connexion.',
    justNow: 'à l’instant', dismiss: 'Fermer la notification', close: 'Fermer le panneau d’actualités', original: 'Titre original : {title}',
    fatalTitle: 'Le globe n’a pas pu démarrer',
    fatalWebgl: 'WebGL, nécessaire à la carte 3D, est désactivé dans votre navigateur ou votre pilote graphique.',
    fatalData: 'Les données de la carte n’ont pas pu être chargées. Vérifiez votre connexion, puis rechargez la page.',
    sample1: 'Exemple : une association de marché local tient son assemblée annuelle',
    sample2: 'Exemple : un distributeur régional publie son bénéfice trimestriel',
    sample3: 'Exemple : les exportations augmentent pour le troisième mois',
    sample4: 'Exemple : la banque centrale abaisse son taux directeur',
    sample5: 'Exemple : crise financière mondiale, les marchés s’effondrent partout',
  },
  es: {
    search: 'Buscar un país o una capital', language: 'Idioma', connecting: 'Conectando', reconnecting: 'Reconectando',
    live: 'Actualizado {time} · {n} países', sources: 'Fuentes: medios nacionales, GDELT Project',
    minor: 'Menor', moderate: 'Moderado', notable: 'Notable', major: 'Importante', critical: 'Crítico',
    latest: 'Las 20 últimas noticias económicas', found: 'Noticias económicas encontradas hasta ahora: {n}', loading: 'Cargando',
    empty: 'Aún no hay noticias económicas. Se está revisando este país y lo que se encuentre aparecerá aquí automáticamente.',
    offline: 'No se pudieron cargar las noticias. Se reintentará cuando vuelva la conexión.',
    justNow: 'ahora mismo', dismiss: 'Cerrar notificación', close: 'Cerrar el panel de noticias', original: 'Titular original: {title}',
    fatalTitle: 'No se pudo iniciar el globo',
    fatalWebgl: 'WebGL, necesario para el mapa 3D, está desactivado en tu navegador o controlador gráfico.',
    fatalData: 'No se pudieron cargar los datos del mapa. Comprueba tu conexión y recarga la página.',
    sample1: 'Ejemplo: una asociación de mercado local celebra su reunión anual',
    sample2: 'Ejemplo: un minorista regional presenta beneficios trimestrales',
    sample3: 'Ejemplo: las exportaciones suben por tercer mes',
    sample4: 'Ejemplo: el banco central baja su tipo de interés',
    sample5: 'Ejemplo: crisis financiera mundial, los mercados se desploman en todo el mundo',
  },
  de: {
    search: 'Land oder Hauptstadt suchen', language: 'Sprache', connecting: 'Verbindung wird aufgebaut', reconnecting: 'Verbindung wird wiederhergestellt',
    live: 'Aktualisiert {time} · {n} Länder', sources: 'Quellen: nationale Medien, GDELT Project',
    minor: 'Gering', moderate: 'Mäßig', notable: 'Beachtlich', major: 'Groß', critical: 'Kritisch',
    latest: 'Die 20 neuesten Wirtschaftsnachrichten', found: 'Bisher gefundene Wirtschaftsnachrichten: {n}', loading: 'Wird geladen',
    empty: 'Noch keine Wirtschaftsnachrichten. Dieses Land wird gerade geprüft, Funde erscheinen hier automatisch.',
    offline: 'Die Nachrichten konnten nicht geladen werden. Neuer Versuch, sobald die Verbindung zurück ist.',
    justNow: 'gerade eben', dismiss: 'Benachrichtigung schließen', close: 'Nachrichtenbereich schließen', original: 'Originaltitel: {title}',
    fatalTitle: 'Der Globus konnte nicht starten',
    fatalWebgl: 'WebGL, das die 3D-Karte benötigt, ist in deinem Browser oder Grafiktreiber deaktiviert.',
    fatalData: 'Die Kartendaten konnten nicht geladen werden. Prüfe deine Verbindung und lade die Seite neu.',
    sample1: 'Beispiel: Lokaler Marktverband hält Jahresversammlung ab',
    sample2: 'Beispiel: Regionaler Händler meldet Quartalsgewinn',
    sample3: 'Beispiel: Exporte steigen den dritten Monat in Folge',
    sample4: 'Beispiel: Zentralbank senkt den Leitzins',
    sample5: 'Beispiel: Globale Finanzkrise, Märkte brechen weltweit ein',
  },
  pt: {
    search: 'Procurar um país ou capital', language: 'Idioma', connecting: 'A ligar', reconnecting: 'A religar',
    live: 'Atualizado {time} · {n} países', sources: 'Fontes: média nacionais, GDELT Project',
    minor: 'Menor', moderate: 'Moderado', notable: 'Notável', major: 'Importante', critical: 'Crítico',
    latest: 'As 20 últimas notícias económicas', found: 'Notícias económicas encontradas até agora: {n}', loading: 'A carregar',
    empty: 'Ainda não há notícias económicas. Este país está a ser verificado e o que for encontrado aparecerá aqui automaticamente.',
    offline: 'Não foi possível carregar as notícias. Nova tentativa quando a ligação voltar.',
    justNow: 'agora mesmo', dismiss: 'Fechar notificação', close: 'Fechar o painel de notícias', original: 'Título original: {title}',
    fatalTitle: 'Não foi possível iniciar o globo',
    fatalWebgl: 'O WebGL, necessário para o mapa 3D, está desativado no navegador ou no controlador gráfico.',
    fatalData: 'Não foi possível carregar os dados do mapa. Verifique a ligação e recarregue a página.',
    sample1: 'Exemplo: associação de mercado local realiza reunião anual',
    sample2: 'Exemplo: retalhista regional apresenta lucro trimestral',
    sample3: 'Exemplo: exportações sobem pelo terceiro mês',
    sample4: 'Exemplo: banco central reduz a taxa de juro',
    sample5: 'Exemplo: crise financeira mundial, mercados afundam em todo o mundo',
  },
  it: {
    search: 'Cerca un paese o una capitale', language: 'Lingua', connecting: 'Connessione', reconnecting: 'Riconnessione',
    live: 'Aggiornato {time} · {n} paesi', sources: 'Fonti: media nazionali, GDELT Project',
    minor: 'Minore', moderate: 'Moderato', notable: 'Notevole', major: 'Importante', critical: 'Critico',
    latest: 'Le ultime 20 notizie economiche', found: 'Notizie economiche trovate finora: {n}', loading: 'Caricamento',
    empty: 'Ancora nessuna notizia economica. Questo paese è in fase di controllo e ciò che verrà trovato apparirà qui automaticamente.',
    offline: 'Impossibile caricare le notizie. Nuovo tentativo al ritorno della connessione.',
    justNow: 'proprio ora', dismiss: 'Chiudi notifica', close: 'Chiudi il pannello delle notizie', original: 'Titolo originale: {title}',
    fatalTitle: 'Impossibile avviare il globo',
    fatalWebgl: 'WebGL, necessario per la mappa 3D, è disattivato nel browser o nel driver grafico.',
    fatalData: 'Impossibile caricare i dati della mappa. Verifica la connessione e ricarica la pagina.',
    sample1: 'Esempio: associazione del mercato locale tiene la riunione annuale',
    sample2: 'Esempio: rivenditore regionale annuncia l’utile trimestrale',
    sample3: 'Esempio: le esportazioni salgono per il terzo mese',
    sample4: 'Esempio: la banca centrale taglia il tasso di riferimento',
    sample5: 'Esempio: crisi finanziaria globale, mercati a picco in tutto il mondo',
  },
};
