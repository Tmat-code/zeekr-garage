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
  // ===== U3: Feedback + contact =====
  faellesFejl: {
    nogetGikGalt: 'Something went wrong. Please try again.',
    annuller: 'Cancel',
    valgfri: '(optional)',
    valgfrit: '(optional)',
    logInd: 'Log in',
  },

  oversatTitel: {
    sprogNavn: { da: 'Danish', sv: 'Swedish', en: 'English' },
    oversatFra: (sprog) => `Translated from ${sprog} · machine translation`,
    visOriginal: 'Show original',
    visOversaettelse: 'Show translation',
  },

  feedback: {
    metaTitel: 'Feedback',
    titel: 'Feedback',
    intro:
      'Report bugs and wishes, confirm them together, and vote up the most important ones. We collect them in constructive reports to Zeekr - as a partner who wants to see good cars get even better.',
    meldFejl: 'Report a bug',
    foreslaaOenske: 'Suggest a wish',
    logIndForAtBidrage: 'Log in to contribute',
    note: 'Anyone can read. You only need to log in to report, confirm or comment.',
    alleModeller: 'All models',
    status: 'Status',
    aktive: 'Active',
    afsluttet: 'Closed',
    type: 'Type',
    fejlFane: 'Bugs',
    oenskerFane: 'Wishes',
    soegPlaceholder: 'Search issues…',
    soegHjaelp: 'The search also finds issues written in other languages.',
    kategoriAria: 'Filter by category',
    alleKategorier: 'All categories',
    antal: (n, type) =>
      type === 'oenske'
        ? `${n} ${n === 1 ? 'wish' : 'wishes'}`
        : type === 'fejl'
          ? `${n} ${n === 1 ? 'bug' : 'bugs'}`
          : `${n} ${n === 1 ? 'issue' : 'issues'}`,
    flestStemmer: 'Most votes',
    nyeste: 'Newest',
    tomTitel: 'No issues here yet',
    tomFoerste: 'Be the first to report one.',
    tomFilter: 'Nothing matches the filter yet - try another one.',
    meldInd: 'Report',
    svar: (n) => `${n} ${n === 1 ? 'reply' : 'replies'}`,
    seBilleder: 'See the photos on the issue',
    detaljer: 'Details →',
    rammerHele: (platform) => `affects all of ${platform}`,
  },

  meld: {
    metaTitel: 'Report',
    titel: 'Report',
    intro: 'Search first - that way we avoid duplicates, and the real bugs get more votes.',
    hvadVilDuMelde: 'What do you want to report?',
    vaelgFoer: 'Choose whether it is a ',
    vaelgFejl: 'bug',
    vaelgMidt: ' (something that does not work) or a ',
    vaelgOenske: 'wish',
    vaelgEfter: ' for new functionality.',
    enFejl: 'A bug',
    enFejlTekst: 'Something in the car does not work as it should.',
    etOenske: 'A wish',
    etOenskeTekst: 'A feature or improvement you would like Zeekr to add.',
    trinSoeg: '1. Search',
    trinTjek: '2. Check',
    trinUdfyld: (n) => `${n}. Fill in`,
    soegTitel: (oenske) => `First: has the ${oenske ? 'wish' : 'bug'} already been reported?`,
    soegTekst: (oenske) =>
      `Search for ${oenske ? 'your wish' : 'the bug'}. If something similar exists, give it a "me too" instead - that carries more weight than a new duplicate. The search also finds issues in Danish and Swedish.`,
    phFejl: "E.g. 'charging stops'…",
    phOenske: "E.g. 'wireless CarPlay'…",
    soeg: 'Search',
    findesHerunder: 'Is it listed below? Then give it a "me too" instead.',
    ingenErDin: (oenske) => `None of them ${oenske ? 'your wish' : 'your bug'}?`,
    nejNy: (oenske) => `No, ${oenske ? 'my wish' : 'my bug'} is new → continue`,
    ingenMatch: (oenske) =>
      `No match - ${oenske ? 'your wish' : 'your bug'} seems to be new.`,
    fortsaet: 'Continue →',
    tilbageBoard: '← Back to the list',
    vaelgTypeIgen: '← Choose type again',
    tjekTitel: 'Quick check first',
    tjekFoer: 'Have you tried a ',
    tjekGenstart: 'restart of the screen',
    tjekMidt: ' and checked that you are on the ',
    tjekOta: 'latest OTA',
    tjekEfter: '? Quite a lot of software trouble goes away after a restart or an update - and it saves us duplicates.',
    jaLoeste: 'Yes - and that fixed it',
    jaLoesteSub: 'Then we do not need to report it. Thanks!',
    nejStadig: 'No - the bug is still there',
    nejStadigSub: 'Then let us report it properly →',
    tilbageSoeg: '← Back to search',
    fejlTitel: (oenske) => `Give the ${oenske ? 'wish' : 'bug'} a short, clear title.`,
    fejlBeskriv: (oenske) => `Describe the ${oenske ? 'wish' : 'bug'} a bit more.`,
    fejlModel: (oenske) =>
      `Choose at least one model the ${oenske ? 'wish applies to' : 'bug affects'}.`,
    fejlKategori: 'Choose a category - pick "Other" if none fits.',
    fejlSoftware:
      'Enter the software version (OTA) you are on - it matters as evidence across cars.',
    fraForum: (oenske) =>
      `📌 Created from a forum thread - title and text are prefilled. Check and add model(s)${oenske ? '' : ' + software version'}, so the bug becomes structured feedback.`,
    aabnTraaden: 'Open the thread',
    titelLabel: 'Title',
    titelPhFejl: 'Map module freezes at start-up in cold weather',
    titelPhOenske: 'Wireless CarPlay',
    beskrivelse: 'Description',
    beskrPhFejl: 'What happens, when, and how can it be reproduced?',
    beskrPhOenske: 'What would you like, and why would it make the car better?',
    sprogNote:
      'Feel free to write in English, Danish or Swedish - we translate for the report and the list.',
    billeder: 'Photos',
    billedHjaelpFejl:
      'Photo evidence carries a lot of weight with Zeekr - a screenshot of the error message/OTA screen, a physical defect or a log.',
    billedHjaelpOenske: 'Attach e.g. a sketch or an example of the feature.',
    software: 'Software version (OTA)',
    softwarePh: 'e.g. OS 1.3.0',
    kategori: 'Category',
    vaelgKategori: '- choose category -',
    alvor: 'Severity',
    telefon: 'Phone',
    telefonValgfrit: '- optional',
    telefonHjaelp:
      'Only fill in if the bug is about the phone (CarPlay, Android Auto, Bluetooth, the app). It helps us find patterns across phones.',
    telefonModel: 'Phone model',
    telefonModelPh: 'e.g. iPhone 15 Pro / Samsung S24',
    telefonOs: 'Phone OS',
    telefonOsPh: 'e.g. iOS 18.1 / Android 15',
    modeller: (oenske) =>
      oenske ? 'Which models does the wish apply to?' : 'Which models does the bug affect?',
    modellerHjaelp: 'Pick several if relevant - if it affects the whole platform, it carries more weight.',
    sender: 'Sending…',
    submit: (oenske) => (oenske ? 'Suggest the wish' : 'Report the bug'),
  },

  melding: {
    tilbage: '← Back to the list',
    meldt: (dato, n) =>
      `Reported ${dato} · 🚗 ${n} ${n === 1 ? 'car confirmed' : 'cars confirmed'}`,
    saadanOpleves: 'How the bug shows up',
    oensket: 'The wish',
    fotoBevis: 'Photo evidence',
    billeder: 'Photos',
    billede: 'Photo',
    oplever: 'Are you seeing this too?',
    oplevTekst: 'Confirm with your variant - the more owners, the more weight the bug carries with Zeekr.',
    udenVariant: 'No variant',
  },

  kommentarer: {
    titel: (n) => `💬 Site meeting (${n})`,
    intro:
      'Is it a user error, or do you have a fix? Help the others here - that way a user error is caught before it ends up in the report to Zeekr.',
    ingen: 'No comments yet. Be the first.',
    ejer: 'Owner',
    markeretLoesning: '✅ Marked as solution',
    gem: 'Save',
    skrivPrivat: '✉️ Message privately',
    fjernLoesning: 'Remove solution',
    markerLoesning: '✅ Mark as solution',
    ret: '✏️ Edit',
    slet: '🗑 Delete',
    bekraeftSlet: 'Delete this comment?',
    ph: "E.g.: 'This is actually a setting - go into the menu under…'",
    send: 'Post comment',
    kunneIkkeSende: 'Could not send.',
    forAtKommentere: ' to comment.',
    logIndFoerst: 'Log in to comment.',
    skrivEn: 'Write a comment.',
    forLang: 'The comment is too long.',
    maaIkkeVaereTom: 'The comment cannot be empty.',
    kunModerator: 'Moderators/admins only.',
  },

  kontakt: {
    metaTitel: 'Contact',
    titel: 'Contact the team',
    intro:
      'Something that does not belong in public? Write to us directly and privately - e.g. a complaint about another user, something about security or personal data, or something personal. The message only reaches the team, not the forum.',
    henvisFoer: 'Have you found a ',
    henvisFejl: 'bug in the car',
    henvisMidt: ' or have a wish instead? Then use ',
    henvisLink: 'Report a bug',
    henvisEfter: '. Wishes or bugs about ',
    henvisSiden: 'the site itself',
    henvisSlut: ' belong in the forum group "Om Zeekr Garage".',
    logIndTitel: 'Log in to write to the team',
    logIndTekst:
      'We keep the channel for logged-in owners, so we know who we are talking to and avoid spam.',
    emne: 'Subject',
    emnePh: 'Short heading',
    besked: 'Message',
    beskedPh: 'Describe what it is about. The more specific, the better we can help.',
    svarMail: 'Reply email',
    svarMailPh: 'you@example.com',
    svarMailHjaelp:
      'Fill in if you want the reply at a specific email. Your name and account are included automatically.',
    sender: 'Sending...',
    send: 'Send message',
    takSendt: 'Thanks - your message has been sent. 🙌',
    sendtTekst: (mail) =>
      `The team is notified and will get back to you${mail ? ` at ${mail}` : ' if needed'}. The message is private and only seen by the team - not on the forum.`,
    skrivEnTil: 'Write another',
    tilForsiden: 'Go to the front page',
    udfyldBegge: 'Fill in both subject and message.',
    logIndFoerst: 'Log in to send a message.',
    emneForLangt: 'The subject is too long (max 160 characters).',
    beskedForLang: 'The message is too long (max 4000 characters).',
    mailForkert: 'The reply email does not look right.',
  },

  bil: {
    vaelgModel: 'Choose model…',
    vaelgVariant: 'Choose variant…',
    ejerIkke: 'Do not own a Zeekr yet',
  },
};

