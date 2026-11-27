// UI-ordbog: ENGELSK (også fallback for nordmænd og alle andre sprog).
// Typet ud fra den danske kilde (da.ts) - tsc fanger manglende/overskydende nøgler.

import type { Ordbog } from './da';

export const en: Ordbog = {
  meta: {
    ogLocale: 'en_GB',
    titelStandard: (navn) => `${navn} - Unofficial community for Zeekr owners`,
    beskrivelse:
      'Unofficial, independent community for Zeekr owners in the Nordics. Report, confirm and vote on software bugs across models - and collect them in reports to Zeekr.',
    ogAlt: (navn) => `${navn} - unofficial community for Zeekr owners in the Nordics`,
    manifestNavn: (navn) => `${navn} - unofficial community for Zeekr owners`,
    manifestBeskrivelse:
      'Unofficial, independent community for Zeekr owners in the Nordics - report, confirm and vote on software bugs.',
  },

  ramme: {
    underOpbygning: (navn) =>
      `${navn} is under construction - new content and features are added continuously.`,
    tagline: 'unofficial owner community',
    disclaimer: (domaene) =>
      `${domaene} is an unofficial, independent owner community. The site is not affiliated with, sponsored or endorsed by ZEEKR, Geely or their subsidiaries.`,
  },

  nav: {
    forum: 'Forum',
    feedback: 'Feedback',
    events: 'Events',
    ota: 'OTA',
    links: 'Links',
    om: 'About',
    kontakt: 'Contact',
    vaerkstedet: 'Workshop',
    aabneRapporter: (n) => `${n} open forum ${n === 1 ? 'report' : 'reports'}`,
    beskeder: 'Messages',
    minGarage: 'My garage',
    logUd: 'Log out',
    logInd: 'Log in',
    aabnMenu: 'Open menu',
    lukMenu: 'Close menu',
  },

  sprog: {
    label: 'Language',
    feltHjaelp:
      'The language of menus, buttons and page text. Posts, reports and other user content are shown in the language they were written in.',
    gem: 'Save language',
    gemmer: 'Saving…',
    gemt: 'Saved.',
    fejl: 'Could not save the language. Please try again.',
  },

  faelles: {
    alle: 'All',
    filtrerModel: 'Filter by model',
  },

  stem: {
    stemt: 'voted',
    migMed: 'me too',
    registrer: 'register',
    logIndForAtStemme: 'Log in to vote',
    registrerForAtStemme: 'Register your car in My garage to vote',
    rammerIkkeDin: (model) => `Does not affect your ${model}`,
    rammerIngen: 'Does not affect any of your cars',
    fjernMine: (n) => `Remove my ${n} confirmations`,
    fjernMin: 'Remove my confirmation',
    bekraeftMedDine: (n) => `Confirm with your ${n} cars (one vote per car)`,
    bekraeftMedDin: (bil) => `Confirm with your ${bil}`,
  },

  config: {
    type: {
      fejl: { navn: 'Bug', flertal: 'bugs', badge: 'Bug' },
      oenske: { navn: 'Wish', flertal: 'wishes', badge: 'Wish' },
    },
    alvor: {
      lav: 'Low',
      middel: 'Medium',
      hoej: 'High',
      kritisk: 'Critical',
    },
    status: {
      ny: 'New',
      bekraeftet: 'Confirmed',
      sendt_til_zeekr: 'Sent to Zeekr',
      afklaret: 'Clarified',
      loest_i_ota: 'Fixed in OTA',
    },
    // Samme ordlyd som rapportens en-labels (lib/rapport-i18n.ts).
    kategori: {
      'koerehjaelp-adas': 'Driver assistance & ADAS',
      'koersel-bremser-understel': 'Driving, brakes & chassis',
      'opladning-raekkevidde': 'Charging & range',
      'skaerm-infotainment': 'Screen, voice & infotainment',
      'app-laas-forbindelse': 'App, lock & connectivity',
      'lys-ruder-udsyn': 'Lights, windows & visibility',
      'klima-saeder-kabine': 'Climate, seats & cabin',
      'hjul-daek-tpms': 'Wheels, tyres & TPMS',
      andet: 'Other',
    },
  },

  tid: {
    datoKommer: 'Date to be announced',
    ligeNu: 'just now',
    minutter: (n) => `${n}m ago`,
    timer: (n) => `${n}h ago`,
    iGaar: 'yesterday',
    dage: (n) => `${n} days ago`,
    uger: (n) => `${n} ${n === 1 ? 'week' : 'weeks'} ago`,
    maaneder: (n) => `${n} ${n === 1 ? 'month' : 'months'} ago`,
    aar: (n) => `${n} ${n === 1 ? 'year' : 'years'} ago`,
  },

  forside: {
    heroLinje1: 'The garage for',
    heroLinje2: 'Zeekr owners in the Nordics',
    heroTekst:
      'An unofficial community where owners meet, share experiences and help each other. We collect bugs and wishes as constructive feedback to Zeekr - because we want to see good cars get even better.',
    vaerMed: 'Join in',
    aabnForum: 'Open the forum',
    heroNote: 'Unofficial owner community · not affiliated with or sponsored by Zeekr.',
    talMeldinger: 'Issues',
    talBekraeftelser: 'Confirmations',
    talModeller: 'Models',
    talSendt: 'Sent to Zeekr',
    forumTitel: 'The forum',
    liveNu: 'Live now',
    forumTekst:
      'The heart of the community: everyday chat, questions and guides - with a dedicated forum for each model, plus charging, software, accessories and life as an owner. Same login as the rest of the site.',
    flereRum: '+ more rooms →',
    opretProfil: 'Create a profile to join the conversation →',
    feedbackTitel: 'Feedback',
    aabnFeedback: 'Open feedback',
    feedbackTekst:
      'Already up and running: report bugs and wishes, confirm them together and vote up the most important ones. We collect them in constructive reports to Zeekr.',
    ingenMeldinger: 'Nothing reported yet - be the first to report something.',
    trinSoeg: 'Search first',
    trinBekraeft: 'Confirm together',
    trinSend: 'Send to Zeekr',
    garageTitel: 'My garage',
    garageTekst:
      'Register your Zeekr so your forum posts show the right car - and your votes count for the right model.',
    registrerBil: 'Register your car',
    linksTitel: 'Useful links',
    linksTekst:
      'Manuals, specs, tests, accessories and a few practical bits - gathered in one place for Zeekr owners.',
    seLinks: 'See useful links',
  },

  om: {
    metaTitel: 'About',
    titel: (navn) => `About ${navn}`,
    afsnit1: (navn) =>
      `${navn} is an unofficial, non-commercial community by and for Zeekr owners in the Nordics. No ads, no affiliate links - just owners helping each other.`,
    afsnit2Foer: 'At its core is a ',
    afsnit2Fed: 'bug board',
    afsnit2Efter:
      ': report software bugs, confirm them together and vote up the most important ones. One bug can be tagged to several models, so we can see when something affects a whole platform. The confirmed bugs are collected in tidy, public reports to Zeekr - as a constructive partner, not an angry pressure group.',
    afsnit3Foer: 'Later on comes a proper ',
    afsnit3Fed: 'forum',
    afsnit3Efter:
      ' with sub-forums per model, threads and guides - with one shared login, so it all feels like one site.',
    disclaimerTitel: 'Disclaimer',
  },

  links: {
    titel: 'Useful links',
    metaBeskrivelse:
      'Useful links for Zeekr owners: official from Zeekr, tests and specs, buying, accessories and practical stuff. Filter by your model.',
    intro:
      'Things we use ourselves as Zeekr owners: official from Zeekr, tests and specs, buying and accessories, and a few practical bits. Filter by your model to see what fits your car - links without a model apply to all.',
    note: 'We do not earn anything from any of the links. External pages open in a new tab.',
  },

  software: {
    titel: 'OTA history',
    metaBeskrivelse:
      'Software and OTA updates for the Zeekr models: version, date and changelog per model. Maintained by owners - newest version at the top.',
    intro:
      'Software and OTA updates per model: version, date and what it brought. Pick your model and expand a version to see the changelog. The newest version is at the top.',
    noteFoer: 'Maintained by us owners. Want to discuss an update? Take it to',
    noteLink: 'your model forum',
    noteEfter: '- each version below links straight there.',
    aendringer: (n) => `${n} ${n === 1 ? 'change' : 'changes'}`,
    ingenPunkter: 'No items listed.',
    diskuter: (model) => `Discuss in the ${model} forum`,
    tomTitel: 'No OTA updates have been logged yet.',
    tomTekst: 'The history fills up as the models receive updates.',
    nyeste: 'Latest:',
    oversatFraDansk: 'Translated from Danish · machine translation',
    visOriginal: 'Show original',
    visOversaettelse: 'Show translation',
  },
};
