// UI-ordbog: DANSK = kilden. sv.ts og en.ts er typet ud fra denne (`Ordbog`),
// så `npx tsc --noEmit` fejler, hvis en nøgle mangler eller er i overskud.
// Parametre + flertal er små funktioner (da/sv/en har alle 1/flere-reglen).
//
// Navngivning: ét namespace pr. område. Skive U1 = ramme, forside, statiske
// sider, config-labels, tid. Senere skiver tilføjer deres egne namespaces.
// Værkstedets moderator-del (U6) får sit eget namespace i lib/i18n/vaerksted/.
//
// NB: ingen runtime-import af lib/config her (config importerer denne fil);
// kun typer.

import type { IssueCategorySlug, IssueType, Severity, Status } from '@/lib/config';

export const da = {
  meta: {
    ogLocale: 'da_DK',
    titelStandard: (navn: string) => `${navn} - Uofficielt community for Zeekr-ejere`,
    beskrivelse:
      'Uofficielt, uafhængigt community for Zeekr-ejere i Norden. Meld, bekræft og stem på softwarefejl på tværs af modeller - og saml dem i rapporter til Zeekr.',
    ogAlt: (navn: string) => `${navn} - uofficielt community for Zeekr-ejere i Norden`,
    manifestNavn: (navn: string) => `${navn} - uofficielt community for Zeekr-ejere`,
    manifestBeskrivelse:
      'Uofficielt, uafhængigt community for Zeekr-ejere i Norden - meld, bekræft og stem på softwarefejl.',
  },

  ramme: {
    underOpbygning: (navn: string) =>
      `${navn} er under opbygning - nyt indhold og funktioner kommer løbende.`,
    tagline: 'uofficielt ejer-community',
    disclaimer: (domaene: string) =>
      `${domaene} er et uofficielt, uafhængigt ejer-community. Siden er ikke tilknyttet, sponsoreret eller godkendt af ZEEKR, Geely eller deres datterselskaber.`,
  },

  nav: {
    forum: 'Forum',
    feedback: 'Feedback',
    events: 'Events',
    ota: 'OTA',
    links: 'Links',
    om: 'Om',
    kontakt: 'Kontakt',
    vaerkstedet: 'Værkstedet',
    aabneRapporter: (n: number) => `${n} åbne forum-rapporter`,
    beskeder: 'Beskeder',
    minGarage: 'Min garage',
    logUd: 'Log ud',
    logInd: 'Log ind',
    aabnMenu: 'Åbn menu',
    lukMenu: 'Luk menu',
  },

  sprog: {
    label: 'Sprog',
    feltHjaelp:
      'Sproget på menuer, knapper og sidetekster. Indlæg, meldinger og andet brugerindhold vises på det sprog, det er skrevet på.',
    gem: 'Gem sprog',
    gemmer: 'Gemmer…',
    gemt: 'Gemt.',
    fejl: 'Kunne ikke gemme sproget. Prøv igen.',
  },

  faelles: {
    alle: 'Alle',
    filtrerModel: 'Filtrér efter model',
  },

  // "Mig med"-knappen (bekræft en melding med sin bil).
  stem: {
    stemt: 'stemt',
    migMed: 'mig med',
    registrer: 'registrér',
    logIndForAtStemme: 'Log ind for at stemme',
    registrerForAtStemme: 'Registrér din bil i Min garage for at stemme',
    rammerIkkeDin: (model: string) => `Rammer ikke din ${model}`,
    rammerIngen: 'Rammer ingen af dine biler',
    fjernMine: (n: number) => `Fjern mine ${n} bekræftelser`,
    fjernMin: 'Fjern min bekræftelse',
    bekraeftMedDine: (n: number) => `Bekræft med dine ${n} biler (én stemme pr. bil)`,
    bekraeftMedDin: (bil: string) => `Bekræft med din ${bil}`,
  },

  // Labels der før lå som dansk tekst i lib/config.ts.
  config: {
    type: {
      fejl: { navn: 'Fejl', flertal: 'fejl', badge: 'Fejl' },
      oenske: { navn: 'Ønske', flertal: 'ønsker', badge: 'Ønske' },
    } satisfies Record<IssueType, { navn: string; flertal: string; badge: string }>,
    alvor: {
      lav: 'Lav',
      middel: 'Middel',
      hoej: 'Høj',
      kritisk: 'Kritisk',
    } satisfies Record<Severity, string>,
    status: {
      ny: 'Ny',
      bekraeftet: 'Bekræftet',
      sendt_til_zeekr: 'Sendt til Zeekr',
      afklaret: 'Afklaret',
      loest_i_ota: 'Løst i OTA',
    } satisfies Record<Status, string>,
    kategori: {
      'koerehjaelp-adas': 'Kørehjælp & ADAS',
      'koersel-bremser-understel': 'Kørsel, bremser & understel',
      'opladning-raekkevidde': 'Opladning & rækkevidde',
      'skaerm-infotainment': 'Skærm, stemme & infotainment',
      'app-laas-forbindelse': 'App, lås & forbindelse',
      'lys-ruder-udsyn': 'Lys, ruder & udsyn',
      'klima-saeder-kabine': 'Klima, sæder & kabine',
      'hjul-daek-tpms': 'Hjul, dæk & TPMS',
      andet: 'Andet',
    } satisfies Record<IssueCategorySlug, string>,
  },

  tid: {
    datoKommer: 'Dato kommer',
    ligeNu: 'lige nu',
    minutter: (n: number) => `${n}m siden`,
    timer: (n: number) => `${n}t siden`,
    iGaar: 'i går',
    dage: (n: number) => `${n} dage siden`,
    uger: (n: number) => `${n} ${n === 1 ? 'uge' : 'uger'} siden`,
    maaneder: (n: number) => `${n} ${n === 1 ? 'måned' : 'måneder'} siden`,
    aar: (n: number) => `${n} år siden`,
  },

  forside: {
    heroLinje1: 'Garagen for',
    heroLinje2: 'Zeekr-ejere i Norden',
    heroTekst:
      'Et uofficielt fællesskab, hvor ejere mødes, deler erfaringer og hjælper hinanden. Vi samler fejl og ønsker som konstruktiv feedback til Zeekr - fordi vi vil se gode biler blive endnu bedre.',
    vaerMed: 'Vær med',
    aabnForum: 'Åbn forummet',
    heroNote: 'Uofficielt ejer-community · ikke tilknyttet eller sponsoreret af Zeekr.',
    talMeldinger: 'Meldinger',
    talBekraeftelser: 'Bekræftelser',
    talModeller: 'Modeller',
    talSendt: 'Sendt til Zeekr',
    forumTitel: 'Forummet',
    liveNu: 'Live nu',
    forumTekst:
      'Fællesskabets hjerte: hverdagssnak, spørgsmål og guides - med et eget forum for hver model, plus opladning, software, tilbehør og livet som ejer. Samme login som resten af siden.',
    flereRum: '+ flere rum →',
    opretProfil: 'Opret profil for at skrive med →',
    feedbackTitel: 'Feedback',
    aabnFeedback: 'Åbn feedback',
    feedbackTekst:
      'Kører allerede: meld fejl og ønsker, bekræft dem sammen, og stem de vigtigste op. Vi samler dem i konstruktive rapporter til Zeekr.',
    ingenMeldinger: 'Ingen meldinger endnu - vær den første til at melde noget ind.',
    trinSoeg: 'Søg først',
    trinBekraeft: 'Bekræft sammen',
    trinSend: 'Send til Zeekr',
    garageTitel: 'Min garage',
    garageTekst:
      'Registrér din Zeekr, så dine indlæg i forummet viser den rigtige bil - og dine stemmer tæller for den rigtige model.',
    registrerBil: 'Registrér din bil',
    linksTitel: 'Nyttige links',
    linksTekst: 'Manualer, specs, test, tilbehør og lidt praktisk - samlet ét sted for Zeekr-ejere.',
    seLinks: 'Se nyttige links',
  },

  om: {
    metaTitel: 'Om',
    titel: (navn: string) => `Om ${navn}`,
    afsnit1: (navn: string) =>
      `${navn} er et uofficielt, ikke-kommercielt community af og for Zeekr-ejere i Norden. Ingen annoncer, ingen affiliate - bare ejere der hjælper hinanden.`,
    afsnit2Foer: 'Kernen er et ',
    afsnit2Fed: 'fejl-board',
    afsnit2Efter:
      ': meld softwarefejl, bekræft dem sammen, og stem de vigtigste op. Én fejl kan tagges til flere modeller, så vi kan se når noget rammer en hel platform. De bekræftede fejl samles i pæne, offentlige rapporter til Zeekr - som en konstruktiv medspiller, ikke en vred pressgruppe.',
    afsnit3Foer: 'Senere kommer et rigtigt ',
    afsnit3Fed: 'forum',
    afsnit3Efter:
      ' med underfora pr. model, tråde og guides - med ét fælles login, så det hele føles som ét site.',
    disclaimerTitel: 'Disclaimer',
  },

  links: {
    titel: 'Nyttige links',
    metaBeskrivelse:
      'Nyttige links for Zeekr-ejere: officielt fra Zeekr, test og specs, køb, tilbehør og praktisk. Filtrér efter din model.',
    intro:
      'Ting vi selv bruger som Zeekr-ejere: officielt fra Zeekr, test og specs, køb og tilbehør, og lidt praktisk. Filtrér på din model, så du ser det, der passer til netop din bil - links uden model gælder alle.',
    note: 'Vi tjener ikke på nogen af linkene. Eksterne sider åbner i et nyt faneblad.',
  },

  software: {
    titel: 'OTA-historik',
    metaBeskrivelse:
      'Software- og OTA-opdateringer til Zeekr-modellerne: version, dato og changelog pr. model. Vedligeholdt af ejere - nyeste version øverst.',
    intro:
      'Software- og OTA-opdateringer pr. model: version, dato og hvad der kom i den. Vælg din model og fold en version ud for at se changeloggen. Nyeste version står øverst.',
    noteFoer: 'Vedligeholdt af os ejere. Vil du diskutere en opdatering, så tag den i',
    noteLink: 'dit model-forum',
    noteEfter: '- hver version nedenfor linker direkte derhen.',
    aendringer: (n: number) => `${n} ${n === 1 ? 'ændring' : 'ændringer'}`,
    ingenPunkter: 'Ingen punkter angivet.',
    diskuter: (model: string) => `Diskutér i ${model}-forummet`,
    tomTitel: 'Der er endnu ikke logget nogen OTA-opdateringer.',
    tomTekst: 'Historikken fyldes efterhånden som der kommer opdateringer til modellerne.',
    nyeste: 'Nyeste:',
    // U1b: maskinoversatte OTA-noter (kun vist på sv/en; originalen er record).
    oversatFraDansk: 'Oversat fra dansk · maskinoversat',
    visOriginal: 'Vis original',
    visOversaettelse: 'Vis oversættelse',
  },
};

export type Ordbog = typeof da;
