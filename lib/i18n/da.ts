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
import type { Kildesprog } from '@/lib/kildesprog';

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
  // ===== U3: Feedback + kontakt =====
  faellesFejl: {
    nogetGikGalt: 'Noget gik galt. Prøv igen.',
    annuller: 'Annullér',
    valgfri: '(valgfri)',
    valgfrit: '(valgfrit)',
    logInd: 'Log ind',
  },

  // U3b: maskinoversatte meldings-titler (board, detalje, forside).
  oversatTitel: {
    sprogNavn: { da: 'dansk', sv: 'svensk', en: 'engelsk' } satisfies Record<Kildesprog, string>,
    oversatFra: (sprog: string) => `Oversat fra ${sprog} · maskinoversat`,
    visOriginal: 'Vis original',
    visOversaettelse: 'Vis oversættelse',
  },

  feedback: {
    metaTitel: 'Feedback',
    titel: 'Feedback',
    intro:
      'Meld fejl og ønsker, bekræft dem sammen, og stem de vigtigste op. Vi samler dem i konstruktive rapporter til Zeekr - som en medspiller, der vil se gode biler blive endnu bedre.',
    meldFejl: 'Meld en fejl',
    foreslaaOenske: 'Foreslå et ønske',
    logIndForAtBidrage: 'Log ind for at bidrage',
    note: 'Alle kan læse. Login kræves kun for at melde, bekræfte eller kommentere.',
    // Boardet
    alleModeller: 'Alle modeller',
    status: 'Status',
    aktive: 'Aktive',
    afsluttet: 'Afsluttet',
    type: 'Type',
    fejlFane: 'Fejl',
    oenskerFane: 'Ønsker',
    soegPlaceholder: 'Søg i meldinger…',
    soegHjaelp: 'Søgningen finder også meldinger skrevet på andre sprog.',
    kategoriAria: 'Filtrér på kategori',
    alleKategorier: 'Alle kategorier',
    antal: (n: number, type: 'alle' | 'fejl' | 'oenske') =>
      type === 'oenske'
        ? `${n} ${n === 1 ? 'ønske' : 'ønsker'}`
        : type === 'fejl'
          ? `${n} fejl`
          : `${n} ${n === 1 ? 'melding' : 'meldinger'}`,
    flestStemmer: 'Flest stemmer',
    nyeste: 'Nyeste',
    tomTitel: 'Ingen meldinger her endnu',
    tomFoerste: 'Vær den første til at melde ind.',
    tomFilter: 'Intet matcher filteret endnu - prøv et andet.',
    meldInd: 'Meld ind',
    svar: (n: number) => `${n} svar`,
    seBilleder: 'Se billeder på meldingen',
    detaljer: 'Detaljer →',
    rammerHele: (platform: string) => `rammer hele ${platform}`,
  },

  meld: {
    metaTitel: 'Meld ind',
    titel: 'Meld ind',
    intro: 'Søg først - så undgår vi dubletter, og de rigtige fejl får flere stemmer.',
    // Trin 0
    hvadVilDuMelde: 'Hvad vil du melde?',
    vaelgFoer: 'Vælg om det er en ',
    vaelgFejl: 'fejl',
    vaelgMidt: ' (noget der ikke virker) eller et ',
    vaelgOenske: 'ønske',
    vaelgEfter: ' til ny funktionalitet.',
    enFejl: 'En fejl',
    enFejlTekst: 'Noget i bilen virker ikke, som det skal.',
    etOenske: 'Et ønske',
    etOenskeTekst: 'En funktion eller forbedring, du ønsker Zeekr tilføjer.',
    // Trin-indikator
    trinSoeg: '1. Søg',
    trinTjek: '2. Tjek',
    trinUdfyld: (n: number) => `${n}. Udfyld`,
    // Trin 1
    soegTitel: (oenske: boolean) => `Først: er ${oenske ? 'ønsket' : 'fejlen'} allerede meldt?`,
    soegTekst: (oenske: boolean) =>
      `Søg efter ${oenske ? 'dit ønske' : 'fejlen'}. Findes der noget, der ligner, så giv det et "mig med" i stedet - det vejer tungere end en ny dublet. Søgningen finder også meldinger på svensk og engelsk.`,
    phFejl: "Fx 'opladning stopper'…",
    phOenske: "Fx 'trådløst CarPlay'…",
    soeg: 'Søg',
    findesHerunder: 'Findes den herunder? Så giv den et "mig med" i stedet.',
    ingenErDin: (oenske: boolean) => `Er ingen af dem ${oenske ? 'dit ønske' : 'din fejl'}?`,
    nejNy: (oenske: boolean) => `Nej, ${oenske ? 'mit ønske' : 'min fejl'} er ny → fortsæt`,
    ingenMatch: (oenske: boolean) =>
      `Ingen match - ${oenske ? 'dit ønske' : 'din fejl'} ser ud til at være ny.`,
    fortsaet: 'Fortsæt →',
    tilbageBoard: '← Tilbage til boardet',
    vaelgTypeIgen: '← Vælg type igen',
    // Trin 2
    tjekTitel: 'Hurtig-tjek først',
    tjekFoer: 'Har du prøvet en ',
    tjekGenstart: 'genstart af skærmen',
    tjekMidt: ' og tjekket at du er på ',
    tjekOta: 'nyeste OTA',
    tjekEfter: '? En del software-bøvl forsvinder efter en genstart eller en opdatering - så slipper vi for dubletter.',
    jaLoeste: 'Ja - og det løste det',
    jaLoesteSub: 'Så behøver vi ikke melde den. Tak!',
    nejStadig: 'Nej - fejlen er der stadig',
    nejStadigSub: 'Så melder vi den rigtigt →',
    tilbageSoeg: '← Tilbage til søgning',
    // Formularen
    fejlTitel: (oenske: boolean) => `Giv ${oenske ? 'ønsket' : 'fejlen'} en kort, tydelig titel.`,
    fejlBeskriv: (oenske: boolean) => `Beskriv ${oenske ? 'ønsket' : 'fejlen'} lidt mere.`,
    fejlModel: (oenske: boolean) =>
      `Vælg mindst én model ${oenske ? 'ønsket gælder' : 'fejlen rammer'}.`,
    fejlKategori: 'Vælg en kategori - tag "Andet", hvis ingen passer.',
    fejlSoftware:
      'Skriv hvilken softwareversion (OTA) du er på - det er vigtigt for bevis på tværs.',
    fraForum: (oenske: boolean) =>
      `📌 Oprettet ud fra en forum-tråd - titel og tekst er forudfyldt. Tjek og tilføj model(ler)${oenske ? '' : ' + softwareversion'}, så fejlen bliver struktureret feedback.`,
    aabnTraaden: 'Åbn tråden',
    titelLabel: 'Titel',
    titelPhFejl: 'Kortmodul fryser ved opstart i koldt vejr',
    titelPhOenske: 'Trådløst CarPlay',
    beskrivelse: 'Beskrivelse',
    beskrPhFejl: 'Hvad sker der, hvornår, og hvordan genskaber man det?',
    beskrPhOenske: 'Hvad ønsker du, og hvorfor ville det gøre bilen bedre?',
    sprogNote:
      'Skriv gerne på dansk, svensk eller engelsk - vi oversætter til rapporten og boardet.',
    billeder: 'Billeder',
    billedHjaelpFejl:
      'Foto-bevis vejer tungt over for Zeekr - skærmbillede af fejlbesked/OTA-skærm, en fysisk defekt eller en log.',
    billedHjaelpOenske: 'Vedhæft fx en skitse eller et eksempel på funktionen.',
    software: 'Softwareversion (OTA)',
    softwarePh: 'fx OS 1.3.0',
    kategori: 'Kategori',
    vaelgKategori: '- vælg kategori -',
    alvor: 'Alvorlighed',
    telefon: 'Telefon',
    telefonValgfrit: '- valgfrit',
    telefonHjaelp:
      'Udfyld kun hvis fejlen handler om telefonen (CarPlay, Android Auto, Bluetooth, appen). Det hjælper med at finde mønstre på tværs af telefoner.',
    telefonModel: 'Telefonmodel',
    telefonModelPh: 'fx iPhone 15 Pro / Samsung S24',
    telefonOs: 'Telefonens OS',
    telefonOsPh: 'fx iOS 18.1 / Android 15',
    modeller: (oenske: boolean): string =>
      oenske ? 'Hvilke modeller gælder ønsket?' : 'Hvilke modeller rammer fejlen?',
    modellerHjaelp: 'Tag gerne flere - rammer den hele platformen, vægter det tungere.',
    sender: 'Sender…',
    submit: (oenske: boolean): string => (oenske ? 'Foreslå ønsket' : 'Meld fejlen'),
  },

  melding: {
    tilbage: '← Tilbage til listen',
    meldt: (dato: string, n: number) =>
      `Meldt ${dato} · 🚗 ${n} ${n === 1 ? 'bil bekræftet' : 'biler bekræftet'}`,
    saadanOpleves: 'Sådan opleves fejlen',
    oensket: 'Ønsket',
    fotoBevis: 'Foto-bevis',
    billeder: 'Billeder',
    billede: 'Billede',
    oplever: 'Oplever du også dette?',
    oplevTekst: 'Bekræft med din variant - jo flere ejere, jo tungere vejer fejlen over for Zeekr.',
    udenVariant: 'Uden variant',
  },

  kommentarer: {
    titel: (n: number) => `💬 Byggemøde (${n})`,
    intro:
      'Er det en betjeningsfejl, eller har du et fix? Hjælp de andre her - så fanges en fejl 40, før den ryger i rapporten til Zeekr.',
    ingen: 'Ingen kommentarer endnu. Vær den første.',
    ejer: 'Ejer',
    markeretLoesning: '✅ Markeret som løsning',
    gem: 'Gem',
    skrivPrivat: '✉️ Skriv privat',
    fjernLoesning: 'Fjern løsning',
    markerLoesning: '✅ Markér som løsning',
    ret: '✏️ Ret',
    slet: '🗑 Slet',
    bekraeftSlet: 'Slet denne kommentar?',
    ph: "Fx: 'Dette er faktisk en indstilling - gå ind i menuen under…'",
    send: 'Send kommentar',
    kunneIkkeSende: 'Kunne ikke sende.',
    forAtKommentere: ' for at kommentere.',
    // Server-fejl
    logIndFoerst: 'Log ind for at kommentere.',
    skrivEn: 'Skriv en kommentar.',
    forLang: 'Kommentaren er for lang.',
    maaIkkeVaereTom: 'Kommentaren må ikke være tom.',
    kunModerator: 'Kun moderator/admin.',
  },

  kontakt: {
    metaTitel: 'Kontakt',
    titel: 'Kontakt staben',
    intro:
      'Noget der ikke hører hjemme offentligt? Skriv direkte og privat til os - fx en klage over en anden bruger, noget om sikkerhed eller persondata, eller noget personligt. Beskeden lander kun hos staben, ikke på forummet.',
    henvisFoer: 'Har du i stedet fundet en ',
    henvisFejl: 'fejl på bilen',
    henvisMidt: ' eller et ønske til et board, så brug ',
    henvisLink: 'Meld en fejl',
    henvisEfter: '. Ønsker eller fejl ved ',
    henvisSiden: 'selve siden',
    henvisSlut: ' hører til i forumgruppen "Om Zeekr Garage".',
    logIndTitel: 'Log ind for at skrive til staben',
    logIndTekst:
      'Vi holder kanalen for indloggede ejere, så vi ved hvem vi taler med og undgår spam.',
    // Formularen
    emne: 'Emne',
    emnePh: 'Kort overskrift',
    besked: 'Besked',
    beskedPh: 'Beskriv hvad det handler om. Jo mere konkret, jo bedre kan vi hjælpe.',
    svarMail: 'Svar-mail',
    svarMailPh: 'dig@eksempel.dk',
    svarMailHjaelp:
      'Udfyld hvis du vil have svar på en bestemt mail. Dit navn og din konto følger automatisk med.',
    sender: 'Sender...',
    send: 'Send henvendelse',
    takSendt: 'Tak - din henvendelse er sendt. 🙌',
    sendtTekst: (mail: string | null) =>
      `Staben får besked og vender tilbage${mail ? ` på ${mail}` : ', hvis der er brug for det'}. Beskeden er privat og ses kun af staben - ikke på forummet.`,
    skrivEnTil: 'Skriv en til',
    tilForsiden: 'Til forsiden',
    // Fejl (klient + kendte RPC-fejl)
    udfyldBegge: 'Udfyld både emne og besked.',
    logIndFoerst: 'Log ind for at sende en henvendelse.',
    emneForLangt: 'Emnet er for langt (maks 160 tegn).',
    beskedForLang: 'Beskeden er for lang (maks 4000 tegn).',
    mailForkert: 'Svar-mailen ser ikke rigtig ud.',
  },

  bil: {
    vaelgModel: 'Vælg model…',
    vaelgVariant: 'Vælg variant…',
    ejerIkke: 'Ejer ikke en Zeekr endnu',
  },
};

export type Ordbog = typeof da;
