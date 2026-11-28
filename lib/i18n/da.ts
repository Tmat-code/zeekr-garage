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
import type { ModGrund } from '@/lib/moderering';
import type { GotrueFejl } from '@/lib/gotrue-fejl';
import type { BeskedFejl } from '@/lib/beskeder-fejl';
import type { EventFejl } from '@/lib/events-fejl';

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

  // U2: forum-UI (oversigt, kategori, tråd, ny tråd, søgning, regler-rammen,
  // moderering af tråde). Kategorinavne/-beskrivelser + forum-regler er DB-
  // indhold og forbliver dansk til U7.
  forum: {
    // Oversigt (/forum)
    metaTitel: 'Forum',
    metaBeskrivelse:
      'Fællesskabet for Zeekr-ejere i Norden - ét forum pr. model plus snak om opladning, software, tilbehør og livet som ejer.',
    titel: 'Forum',
    introFoer:
      'Snak, spørgsmål og erfaringer - med et eget forum for hver model. Stødt på en rigtig fejl? Den hører hjemme på',
    introLink: 'Feedback',
    introEfter: ', hvor vi samler den struktureret til Zeekr.',
    alleKanLaese: 'Alle kan læse. Login kræves kun for at oprette tråde og svare.',
    nyHerLaes: 'Ny her? Læs',
    reglerLink: 'forum-reglerne',
    reglerEfter: '- sådan er tonen i Garagen.',
    // Undertekst pr. gruppe - nøglen er gruppens (danske) navn fra DB'en.
    gruppeTekst: {
      Velkommen: 'Start her - sig hej og læs husreglerne.',
      Modellerne: 'Ét forum pr. model - rygraden i fællesskabet.',
      'Ejer-lounge': 'Livet som ejer: køb, test, billeder.',
      Teknik: 'Software, opladning, tilbehør og app.',
    } as Record<string, string>,
    kunModeratorerOpretter: 'Kun moderatorer opretter tråde her',
    ejere: (n: number) => `${n} ${n === 1 ? 'ejer' : 'ejere'}`,
    traadeLabel: (n: number): string => (n === 1 ? 'tråd' : 'tråde'),
    visningerLabel: 'visninger',
    svarLabel: (_n: number): string => 'svar',
    ny: 'ny',

    // Kategori-side
    tilbageForum: '← Forum',
    nyTraad: 'Ny tråd',
    kunModeratorer: '🔒 Kun moderatorer',
    logIndForAtSkrive: 'Log ind for at skrive',
    ejereIGaragen: (n: number) => `${n} ${n === 1 ? 'ejer' : 'ejere'} i Garagen`,
    biler: (n: number) => `${n} ${n === 1 ? 'bil' : 'biler'}`,
    bekraeftelser: (n: number) => `${n} ${n === 1 ? 'bekræftelse' : 'bekræftelser'}`,
    nyesteOs: 'Nyeste OS:',
    seHistorik: 'se historik →',
    ingenTraade: 'Ingen tråde endnu.',
    vaerFoersteTraad: 'Vær den første til at starte en →',
    fastgjort: 'Fastgjort',
    laast: 'Låst',
    ejer: 'Ejer',

    // Tråd-side
    traadMetaFallback: 'Tråd',
    fastgjortChip: '📌 Fastgjort',
    laastChip: '🔒 Låst',
    traadMeta: (dato: string, svar: number, visninger: number) =>
      `Oprettet ${dato} · ${svar} svar · ${visninger} ${visninger === 1 ? 'visning' : 'visninger'}`,

    // Ny tråd
    nyTraadMeta: (kategori: string) => `Ny tråd - ${kategori}`,
    nyTraadTitel: (kategori: string) => `Ny tråd i ${kategori}`,
    nyTraadIntro: 'Hold en god, konstruktiv tone - vi er her for at hjælpe hinanden.',
    titelLabel: 'Titel',
    titelPh: (kategori: string) => `Hvad vil du tage op i ${kategori}?`,
    ditIndlaeg: 'Dit indlæg',
    indlaegPh: 'Skriv løs - spørgsmål, erfaring eller en god historie.',
    billederValgfrit: 'Billeder (valgfrit)',
    opretter: 'Opretter…',
    opretTraad: 'Opret tråd',
    kunneIkkeOprette: 'Kunne ikke oprette tråden.',

    // Regler-siden (rammen - selve reglerne er DB-indhold)
    reglerMetaTitel: 'Forum-regler',
    reglerMetaBeskrivelse:
      'Spilleregler og tone i Zeekr Garages forum - sådan holder vi en god stemning.',
    reglerBroedkrumme: 'Regler',
    reglerTitel: 'Forum-regler',
    opdateret: (tid: string) => `Opdateret ${tid}`,
    reglerTomme:
      'Reglerne er ved at blive sat op. Kig forbi igen om lidt - i mellemtiden gælder god, almindelig fornuft: tal pænt, hold dig til emnet, og del ikke andres personlige oplysninger.',
    reglerFejlFoer: 'Stødt på en rigtig fejl i stedet for et spørgsmål?',
    reglerFejlLink: 'Opret den på Feedback',
    reglerFejlEfter: ', så samler vi den struktureret til Zeekr.',

    // Søgning
    soegMeta: (q: string) => `Søg: ${q}`,
    soegTitel: 'Søg i forummet',
    soegIntro: 'Søger i både trådtitler og indlæg. Vælg et forum i feltet for at afgrænse søgningen.',
    soegTom: 'Skriv et søgeord ovenfor for at finde tråde.',
    ingenMatch: 'Ingen tråde matcher',
    iScope: 'i',
    proevAndetScope: 'Prøv et andet søgeord - eller',
    soegAlleFora: 'søg i alle fora',
    proevAndet: 'Prøv et andet eller kortere søgeord - eller',
    gennemse: 'gennemse kategorierne',
    antalMatcher: (n: number) => `${n} ${n === 1 ? 'tråd' : 'tråde'} matcher`,
    soegIPh: (navn: string) => `Søg i ${navn}…`,
    soegAllePh: 'Søg i alle tråde…',
    soegIAria: (navn: string) => `Søg i ${navn}`,
    soegAlleAria: 'Søg i alle forum-tråde',
    afgraensAria: 'Afgræns søgningen til et forum',
    alleFora: 'Alle fora',
    soeg: 'Søg',

    // Indlæg + svar (ForumTraad)
    redigeret: 'redigeret',
    svarer: 'svarer',
    traadTekstPh: 'Trådens tekst…',
    svarPh: 'Skriv et svar…',
    svarTilPh: (navn: string) => `Svar til ${navn}…`,
    maksBilleder: (n: number) => `Maks ${n} billeder pr. indlæg.`,
    gem: 'Gem',
    oversaetter: 'Oversætter…',
    oversaet: '🌐 Oversæt',
    visOriginal: 'Vis original',
    oversatFra: (sprog: string) => `Oversat fra ${sprog} · maskinoversat`,
    kunneIkkeOversaette: 'Kunne ikke oversætte lige nu',
    // Kildesprog fra LibreTranslate kan være andet end da/sv/en (fx norsk).
    sprogNavne: {
      da: 'dansk',
      sv: 'svensk',
      en: 'engelsk',
      no: 'norsk',
      nb: 'norsk',
      nn: 'norsk',
      de: 'tysk',
      fi: 'finsk',
    } as Record<string, string>,
    billedeIIndlaeg: 'Billede i indlæg',
    svarKnap: '↩ Svar',
    ret: '✏️ Ret',
    bekraeftFjern: 'Fjern dette indlæg?',
    fjern: '🗑 Fjern',
    fjernAvatar: '🧑 Fjern avatar',
    skriv: '✉️ Skriv',
    fjernIndlaegBesked: 'Fjern indlæg + giv besked',
    fjernAvatarBesked: 'Fjern avatar + giv besked',
    kunneIkkeStarteSamtale: 'Kunne ikke starte samtalen.',
    skjulSvar: '▾ Skjul svar',
    visSvar: (n: number) => `▸ Vis ${n} svar`,
    svarFjernet: '🚫 Svar fjernet',
    vaerFoersteSvar: 'Vær den første der svarer',
    svarAntal: (n: number) => `Svar (${n})`,
    traadLaast: '🔒 Tråden er låst - der kan ikke skrives flere svar.',
    svarerTil: 'Svarer',
    annullerSvarMaal: 'Annullér svar-mål',
    svarHeleTraaden: '× Svar til hele tråden',
    sendSvar: 'Send svar',
    forAtSvare: 'for at svare.',

    // Moderering af tråd (TraadModeration)
    moderering: '🔧 Moderering:',
    opretSomFeedbackTitel: 'Er det en rigtig fejl? Opret den som struktureret feedback til Zeekr.',
    opretSomFeedback: '→ Opret som feedback',
    fjernFastgoerelse: 'Fjern fastgørelse',
    fastgoer: '📌 Fastgør',
    laasOp: 'Lås op',
    laas: '🔒 Lås',
    fjernTraad: '🗑 Fjern tråd',
    fjernTraadBesked: 'Fjern tråd + giv besked',

    // Grund-vælger + rapportér
    bekraeft: 'Bekræft',
    dubletPh: 'Link til original (valgfrit)',
    uddybPh: 'Uddyb (valgfrit)',
    fortryd: 'Fortryd',
    rapporteret: '⚑ Rapporteret - tak',
    rapporter: '⚑ Rapportér',
    sendRapport: 'Send rapport',
    kunneIkkeSendeRapport: 'Kunne ikke sende rapporten.',

    // Server-fejl (app/forum/actions.ts)
    logIndOpret: 'Log ind for at oprette en tråd.',
    sigendeTitel: 'Giv tråden en sigende titel.',
    titelForLang: 'Titlen er for lang (maks. 160 tegn).',
    skrivAabning: 'Skriv et åbnings-indlæg.',
    indlaegForLangt: 'Indlægget er for langt.',
    kategoriFindesIkke: 'Kategorien findes ikke.',
    logIndSvar: 'Log ind for at svare.',
    skrivSvarEllerBillede: 'Skriv et svar eller vedhæft et billede.',
    svarForLangt: 'Svaret er for langt.',
    svarMaalFindesIkke: 'Svar-målet findes ikke i tråden.',
    logIndRet: 'Log ind for at rette.',
    indlaegFindesIkke: 'Indlægget findes ikke.',
    aabningSkalHaveTekst: 'Åbnings-indlægget skal have tekst.',
    skrivNogetEllerBehold: 'Skriv noget eller behold mindst ét billede.',
    kunModerator: 'Kun moderator/admin.',
    logIndRapporter: 'Log ind for at rapportere.',
    ingenReference: 'Ingen reference at rapportere.',
    ugyldigGrund: 'Ugyldig grund.',
  },

  // U2: moderings-grunde (lib/moderering.ts - bruges af rapportér-knappen og
  // moderator-handlingerne). Nøglerne = enum-værdierne i DB'en.
  modGrund: {
    dublet: 'Dublet',
    tone: 'Tone / personangreb',
    'off-topic': 'Off-topic',
    spam: 'Spam',
    andet: 'Andet',
  } satisfies Record<ModGrund, string>,
  modGrundUkendt: 'ukendt',

  // U2: billed-upload + galleri (forum, /meld, beskeder).
  billeder: {
    logIndUpload: 'Log ind for at uploade billeder.',
    kunBilleder: 'Kun billeder (JPG, PNG, WebP, GIF).',
    forStort: 'Billedet er for stort (maks 5 MB).',
    uploadFejlede: (fejl: string) => `Upload fejlede: ${fejl}`,
    uploader: 'Uploader…',
    tilfoej: 'Tilføj billede',
    taeller: (n: number, maks: number) => `${n}/${maks} · maks 5 MB`,
    vedhaeftet: 'Vedhæftet billede',
    fjern: 'Fjern billede',
    fortrydFjern: 'Fortryd fjern billede',
    standardAlt: 'Billede',
    aabn: (nr: number, alt: string) => `Åbn ${alt.toLowerCase()} ${nr}`,
    luk: 'Luk billede',
    profilbillede: (navn: string | null) => (navn ? `${navn}s profilbillede` : 'Profilbillede'),
  },
  // U4: konto - log ind + opret bruger (LoginForm), nulstil password, GoTrue-
  // fejl mappet via lib/gotrue-fejl.ts, beskeder efter klik på mail-links.
  konto: {
    loginMetaTitel: 'Log ind',
    loginTitel: 'Log ind',
    loginIntro: 'For at melde, bekræfte og kommentere.',
    fanLogInd: 'Log ind',
    fanOpret: 'Opret konto',
    tilbageTilLogin: '← Tilbage til login',
    visningsnavn: 'Visningsnavn',
    visningsnavnPh: "Sådan vises du i community'et",
    dinBil: 'Din bil',
    hvorforBil:
      'Hvorfor spørger vi? Din bil knytter dine "mig med"-stemmer til en rigtig model og variant, så fejl-rapporterne til Zeekr bliver præcise. Ejer du ikke en Zeekr endnu, kan du stadig læse og følge med - du kan bare ikke stemme, før din bil er registreret. Du kan altid rette den under Min garage.',
    email: 'E-mail',
    emailPh: 'dig@eksempel.dk',
    adgangskode: 'Adgangskode',
    adgangskodePh: 'Mindst 6 tegn',
    glemt: 'Glemt password?',
    vent: 'Vent…',
    opretKonto: 'Opret konto',
    sendNulstil: 'Send nulstillingslink',
    logInd: 'Log ind',
    kunForAtBidrage: 'Du behøver kun en konto for at bidrage. Læsning er altid fri.',
    // Kvitteringer
    nulstilSendt:
      'Hvis der findes en konto på den mail, har vi sendt et nulstillingslink. Tjek din indbakke.',
    kontoOprettet:
      'Konto oprettet. Vi har sendt en bekræftelsesmail - klik linket i den for at aktivere din konto. Tjek også din spam-mappe.',
    // Validering (klient)
    ugyldigMail: 'Skriv en gyldig e-mail.',
    kodeForKort: 'Adgangskode skal være mindst 6 tegn.',
    vaelgModelEllerEjerIkke: 'Vælg din model - eller markér "Ejer ikke en Zeekr endnu".',
    vaelgVariant: 'Vælg din variant.',
    // Fallbacks når GoTrue-fejlen er ukendt
    kunneIkkeLogge: 'Kunne ikke logge ind. Prøv igen.',
    kunneIkkeOprette: 'Kunne ikke oprette kontoen. Prøv igen.',
    kunneIkkeSendeNulstil: 'Kunne ikke sende nulstillingslink. Prøv igen.',
    // /login?fejl=... efter et udløbet/brugt mail-link (/auth/confirm, /auth/callback)
    linkFejl: {
      bekraeft:
        'Bekræftelseslinket er udløbet eller allerede brugt. Log ind, eller opret kontoen igen.',
      reset: 'Nulstillingslinket er udløbet eller allerede brugt. Bed om et nyt via "Glemt password".',
      mail: 'Linket til at skifte e-mail er udløbet eller allerede brugt. Log ind og prøv igen fra Min garage.',
      link: 'Linket er udløbet eller ugyldigt. Prøv igen.',
    },
    // GoTrue-fejl (nøgler = GotrueFejl i lib/gotrue-fejl.ts)
    gotrue: {
      forkertLogin: 'Forkert e-mail eller adgangskode.',
      ikkeBekraeftet:
        'Din e-mail er ikke bekræftet endnu. Klik linket i bekræftelsesmailen (tjek også spam-mappen).',
      findesAllerede: 'Der findes allerede en konto med den e-mail. Log ind i stedet.',
      svagKode: 'Adgangskoden er for svag. Vælg en længere og mindre almindelig adgangskode.',
      mailUgyldig: 'E-mailadressen er ugyldig.',
      forMange: 'Der er sendt for mange forsøg - prøv igen om lidt.',
      opretLukket: 'Det er ikke muligt at oprette nye konti lige nu.',
      sammeKode: 'Det nye password skal være forskelligt fra det gamle.',
      sammeMail: 'Det er din nuværende mail.',
      linkUdloebet: 'Linket er udløbet eller allerede brugt.',
    } satisfies Record<GotrueFejl, string>,
    // /nulstil
    nulstilMetaTitel: 'Vælg nyt password',
    nulstilTitel: 'Vælg nyt password',
    nulstilIntro: 'Skriv et nyt password til din konto.',
    etOejeblik: 'Et øjeblik…',
    nulstilLinkUdloebet: 'Linket er udløbet eller ugyldigt.',
    nytPassword: 'Nyt password',
    gentagPassword: 'Gentag password',
    gentagPh: 'Skriv det igen',
    gemNytPassword: 'Gem nyt password',
    passwordForKort: 'Password skal være mindst 6 tegn.',
    ikkeEns: 'De to felter er ikke ens.',
    passwordOpdateret: 'Dit password er opdateret. Sender dig videre…',
    kunneIkkeOpdatere:
      'Kunne ikke opdatere password. Linket kan være udløbet - bed om et nyt fra login-siden.',
  },

  // U4: Min garage (siden + profilbillede, navn, biler, skift e-mail).
  garage: {
    metaTitel: 'Min garage',
    titel: '🚗 Min garage',
    intro:
      'Dit navn og dine Zeekr - navnet vises som forfatter, bilerne bruges til "mig med". Ejer du flere, kan du tilføje dem alle.',
    gemmer: 'Gemmer…',
    gemt: 'Gemt.',
    fjern: 'Fjern',
    // Profilbillede
    profilbillede: 'Profilbillede',
    arbejder: 'Arbejder…',
    skiftBillede: 'Skift billede',
    tilfoejBillede: 'Tilføj billede',
    avatarHjaelp:
      'Vises som dit ansigt på tråde, svar, kommentarer og beskeder. Billedet beskæres kvadratisk og gøres mindre automatisk. Har du intet billede, vises dit forbogstav.',
    kunneIkkeBehandle: 'Kunne ikke behandle billedet.',
    kunneIkkeGemmeBillede: 'Kunne ikke gemme billedet.',
    kunneIkkeFjerneBillede: 'Kunne ikke fjerne billedet.',
    logIndForBillede: 'Log ind for at skifte profilbillede.',
    // Visningsnavn
    ditNavn: 'Dit navn',
    navnPh: 'Fx Venø',
    navnHjaelp:
      'Sådan vises du overalt - på tråde, svar og meldinger. Din mail vises aldrig offentligt. Ændrer du navnet, slår det igennem alle steder med det samme.',
    gemNavn: 'Gem navn',
    navnForKort: (min: number) => `Navnet skal være mindst ${min} tegn.`,
    navnForLangt: (maks: number) => `Navnet må højst være ${maks} tegn.`,
    kunneIkkeGemme: 'Kunne ikke gemme.',
    // Biler
    dineBiler: 'Dine biler',
    ingenBiler:
      'Du har ingen biler registreret endnu. Tilføj din Zeekr nedenfor for at kunne bekræfte fejl og ønsker - ellers kan du læse og kommentere.',
    tilfoejEnBil: 'Tilføj en bil',
    flereBilerHjaelp:
      'Ejer du flere Zeekr, så tilføj dem alle - en melding der rammer flere af dine modeller tæller så som én bekræftet bil pr. ramt bil, så rapporterne til Zeekr bliver præcise.',
    tilfoejBil: 'Tilføj bil',
    vaelgModel: 'Vælg din model.',
    vaelgVariant: 'Vælg din variant.',
    kunneIkkeTilfoeje: 'Kunne ikke tilføje bilen.',
    kunneIkkeFjerne: 'Kunne ikke fjerne bilen.',
    // Skift e-mail
    email: 'E-mail',
    nuvaerende: 'Nuværende:',
    nyMailPh: 'ny@mail.dk',
    mailSendtFoer: 'Vi har sendt et bekræftelses-link til din ',
    mailSendtNye: 'nye',
    mailSendtEfter: ' adresse. Mailen skifter først når du har klikket linket. Tjek evt. spam.',
    mailHjaelp:
      'Af sikkerhed skifter mailen ikke med det samme: du får et bekræftelses-link på din nye adresse, og mailen skifter først når du har klikket det. Du er stadig logget ind imens.',
    sender: 'Sender…',
    skiftMail: 'Skift e-mail',
    ugyldigMail: 'Skriv en gyldig e-mailadresse.',
    mailIBrug: 'Den e-mailadresse er allerede i brug.',
    kunneIkkeSendeBekraeftelse: 'Kunne ikke sende bekræftelse. Prøv igen.',
  },

  // U4: notifikations-siden + klokkens ramme. Selve notifikations-teksterne
  // (notifications.tekst) bygges på dansk i DB-triggerne og oversættes i U8.
  notif: {
    metaTitel: 'Notifikationer',
    titel: '🔔 Notifikationer',
    intro:
      'Alt du er blevet prajet om - nyeste først. Klik for at gå til indlægget; slet dem du er færdig med.',
    notifikationer: 'Notifikationer',
    klokkeAria: (n: number) => (n > 0 ? `Notifikationer (${n} ulæste)` : 'Notifikationer'),
    markerAlle: 'Markér alle læst',
    rydLaeste: 'Ryd læste',
    henter: 'Henter …',
    ingenEndnuKlokke: 'Ingen notifikationer endnu.',
    ingenEndnuSide: 'Du har ingen notifikationer endnu.',
    ingen: 'Ingen notifikationer',
    viser: (vist: number, total: number) => `viser ${vist} af ${total}`,
    ulaest: (n: number) => `${n} ulæst`,
    seAlle: 'Se alle',
    visFlere: 'Vis flere',
    slet: 'Slet',
    sletAria: 'Slet notifikation',
    kunneIkkeHente: 'Kunne ikke hente notifikationer.',
    kunneIkkeSlette: 'Kunne ikke slette - prøv igen.',
    kunneIkkeRydde: 'Kunne ikke rydde de læste - prøv igen.',
  },

  // U4 (rykket frem fra U8): GoTrue-mailene for bekræft konto + nulstil password.
  // Skabelonen (app/auth/*-email) indeholder alle tre sprog og vælger via
  // {{ .Data.sprog }} (user_metadata, sat ved signup/sprogvalg); emnet sættes i
  // Coolify (MAILER_SUBJECTS_*) - se HANDOVER "## UI-i18n U4". Ren tekst/HTML-
  // fri; skabelonen escaper ikke selv, så ingen < > & i teksterne.
  mail: {
    kopierLink: 'Virker knappen ikke, så kopiér dette link ind i din browser:',
    bekraeft: {
      emne: 'Bekræft din konto - Zeekr Garage',
      titel: 'Bekræft din konto',
      intro: 'Velkommen til Zeekr Garage. Klik på knappen for at bekræfte din e-mail og aktivere din konto:',
      knap: 'Bekræft min konto',
      ignorer:
        'Har du ikke selv oprettet en konto hos Zeekr Garage, kan du roligt ignorere mailen - der sker ikke noget.',
    },
    nulstil: {
      emne: 'Nulstil dit password - Zeekr Garage',
      titel: 'Nulstil dit password',
      intro: 'Du har bedt om at nulstille passwordet til din Zeekr Garage-konto. Klik på knappen for at vælge et nyt:',
      knap: 'Vælg nyt password',
      ignorer: 'Har du ikke selv bedt om dette, kan du roligt ignorere mailen - dit password bliver ikke ændret.',
    },
  },
  // U5: beskeder (indbakke, samtale, ny besked, grupper). Fejl er nøgler fra
  // lib/beskeder-fejl.ts (server-actions returnerer nøglen, aldrig DB-teksten).
  beskeder: {
    titel: 'Beskeder',
    intro: 'Private samtaler med andre ejere.',
    nyBesked: 'Ny besked',
    logIndIndbakke: 'for at se dine beskeder.',
    logIndNy: 'for at skrive til en anden ejer.',
    logIndSamtale: 'for at se samtalen.',
    tomIndbakke: (knap: string) =>
      `Du har ingen samtaler endnu. Klik "${knap}" for at skrive direkte til en ejer - eller start en fra en andens forum-indlæg.`,
    ingenBeskederEndnu: 'Ingen beskeder endnu',
    ejer: 'Ejer',
    gruppe: 'Gruppe',
    billedeMarkoer: '📷 Billede',
    tilbageAlle: '← Alle beskeder',
    tilbage: '← Beskeder',
    nyIntro: 'Skriv til en anden ejer - eller vælg flere for at lave en gruppe.',
    metaBesked: 'Besked',
    metaBeskedMed: (navn: string) => `Besked med ${navn}`,
    // Samtale
    deltagere: (n: number) => (n === 1 ? '1 deltager' : `${n} deltagere`),
    anmeld: 'Anmeld',
    anmeldPrompt: 'Hvorfor anmelder du denne samtale? (valgfrit)',
    anmeldt: 'Tak - samtalen er anmeldt til moderatorerne.',
    forlad: 'Forlad',
    forladSpm: 'Forlad gruppe?',
    fortryd: 'Fortryd',
    bloker: 'Blokér',
    fjernBlokering: 'Fjern blokering',
    slet: 'Slet',
    sletSpm: 'Slet samtale?',
    sletKortSpm: 'Slet?',
    sletAria: 'Slet samtale',
    ingenBeskederSkriv: 'Ingen beskeder endnu. Skriv den første.',
    billedeAlt: 'Besked-billede',
    blokeretInfo: 'Du har blokeret denne bruger. Fjern blokeringen for at skrive igen.',
    skrivPladsholder: 'Skriv en besked…',
    send: 'Send',
    sendGenvej: '⌘/Ctrl + Enter sender',
    // Ny besked
    tilHvem: 'Til hvem?',
    vaelgEnEllerFlere: '(vælg en eller flere)',
    soegPladsholder: 'Søg på visningsnavn…',
    soegHjaelp: 'Skriv mindst 2 tegn. Vælg én ejer for en privat samtale, eller flere for en gruppe.',
    fjernValgtAria: (navn: string) => `Fjern ${navn}`,
    seneste: 'Ejere du har skrevet med',
    valgt: '✓ Valgt',
    vaelg: 'Vælg',
    soeger: 'Søger…',
    ingenMatch: (term: string) => `Ingen ejere matcher "${term}". Prøv et andet navn.`,
    gruppenavn: 'Gruppenavn',
    gruppenavnEks: 'Fx 7GT-ejere Sjælland',
    udenNavnHjaelp: 'Uden navn opkaldes gruppen efter deltagerne.',
    starter: 'Starter…',
    opretGruppe: (n: number) => `Opret gruppe (${n})`,
    skrivTil: (navn: string) => `Skriv til ${navn}`,
    // Gruppe-panel
    omdoebPladsholder: 'Uden navn: opkaldt efter deltagerne',
    gem: 'Gem',
    deltagereOverskrift: (n: number) => `Deltagere (${n})`,
    dig: '(dig)',
    fjern: 'Fjern',
    tilfoejEjer: 'Tilføj en ejer',
    tilfoej: 'Tilføj →',
    fejl: {
      logInd: 'Log ind for at skrive beskeder.',
      soegning: 'Søgningen fejlede. Prøv igen.',
      kunneIkkeStarte: 'Kunne ikke starte samtalen.',
      kunneIkkeOpretteGruppe: 'Kunne ikke oprette gruppen.',
      kunneIkkeSende: 'Kunne ikke sende beskeden.',
      kunneIkkeSlette: 'Kunne ikke slette samtalen.',
      kunneIkkeForlade: 'Kunne ikke forlade gruppen.',
      kunneIkkeAnmelde: 'Kunne ikke anmelde samtalen.',
      kunneIkkeGemme: 'Kunne ikke gemme ændringen.',
      tomBesked: 'Skriv en besked eller vedhæft et billede.',
      forLang: 'Beskeden er for lang (maks 5000 tegn).',
      blokeret: 'Det går ikke - en af jer har blokeret den anden.',
      forMange: 'For mange deltagere i gruppen (maks 50).',
      mindstTo: 'En gruppe kræver mindst to andre deltagere.',
      brugerFindesIkke: 'Brugeren findes ikke længere.',
      kunOpretter: 'Kun gruppens opretter kan gøre det.',
      digSelv: 'Du kan ikke skrive til dig selv.',
      brugForlad: 'Brug "Forlad" for at fjerne dig selv fra gruppen.',
      nogetGikGalt: 'Noget gik galt. Prøv igen.',
    } satisfies Record<BeskedFejl, string>,
  },

  // U5: events (liste, side, formular, tilmeld, event-styring). Event-MAILEN
  // til de tilmeldte er stadig dansk (U8 - kræver sprog pr. modtager i RPC'en).
  events: {
    titel: 'Events',
    metaBeskrivelse: 'Træf, køreture og meetups for Zeekr-ejere i Norden.',
    metaEvent: 'Event',
    intro:
      'Træf, køreture og meetups for ejere. Meld dig til, så ved vi hvem der kommer - og du får besked, hvis der er nyt.',
    holdetInfo:
      'Events oprettes af holdet bag Garagen. Har du en god idé til et træf, så skriv i forummet under “Træf, køreture & events”.',
    opret: 'Opret event',
    kommende: 'Kommende',
    ingenKommende: 'Ingen kommende events endnu.',
    afholdte: 'Afholdte',
    aflyst: 'Aflyst',
    tilmeldte: (n: number) => (n === 1 ? '1 tilmeldt' : `${n} tilmeldte`),
    tilbage: '← Events',
    oprettetAf: (navn: string) => `Oprettet af ${navn}`,
    foejTilKalender: '📅 Føj til kalender',
    opdateringer: 'Opdateringer',
    holdet: 'Holdet',
    ejer: 'Ejer',
    ny: {
      titel: 'Opret event',
      intro: 'Brugere kan melde sig til, og du kan sende dem en opdatering bagefter.',
    },
    rediger: { titel: 'Rediger event' },
    form: {
      titel: 'Titel',
      titelEks: 'Fx: Køretur til Møns Klint',
      beskrivelse: 'Beskrivelse',
      beskrivelseEks: 'Hvad sker der, program, hvad skal man vide?',
      sted: 'Sted',
      stedEks: 'Fx: P-plads ved Netto, Roskilde',
      start: 'Start',
      slut: 'Slut',
      gemmer: 'Gemmer…',
      gemAendringer: 'Gem ændringer',
      opret: 'Opret event',
    },
    tilmeld: {
      aflyst: 'Eventet er aflyst.',
      varTilmeldt: (n: number) => (n === 1 ? '1 var tilmeldt.' : `${n} var tilmeldt.`),
      logInd: 'Log ind for at melde dig til',
      afmeld: 'Du er tilmeldt - afmeld',
      meldTil: 'Meld dig til',
      duErMed: 'Du er med 👍',
    },
    admin: {
      overskrift: '🔧 Event-styring',
      rediger: '✏️ Rediger',
      genaabn: 'Genåbn event',
      aflys: 'Aflys event',
      bekraeftSlet: 'Bekræft slet',
      fortryd: 'Fortryd',
      slet: '🗑 Slet',
      sendLabel: 'Send opdatering til de tilmeldte',
      sendPladsholder: 'Fx: Vi mødes 15 min før - husk ladebrik. Vejret ser fint ud!',
      sendKnap: 'Send til tilmeldte',
      mailet: (n: number) =>
        n === 1
          ? 'Opdateringen er slået op og mailet til 1 tilmeldt.'
          : `Opdateringen er slået op og mailet til ${n} tilmeldte.`,
      ingenTilmeldte: 'Opdateringen er slået op. Ingen mails sendt (ingen tilmeldte med e-mail).',
      mailFejl: 'Opdateringen er slået op, men mailen kunne ikke sendes.',
    },
    fejl: {
      kunModerator: 'Kun moderatorer og admins kan det.',
      titelForKort: 'Giv eventet en sigende titel (mindst 3 tegn).',
      slutFoerStart: 'Slut kan ikke ligge før start.',
      kunneIkkeOprette: 'Kunne ikke oprette eventet.',
      kunneIkkeGemme: 'Kunne ikke gemme eventet.',
      kunneIkkeAflyse: 'Kunne ikke ændre eventets status.',
      kunneIkkeSlette: 'Kunne ikke slette eventet.',
      logIndTilmeld: 'Log ind for at melde dig til.',
      kunneIkkeTilmelde: 'Kunne ikke melde dig til. Prøv igen.',
      kunneIkkeAfmelde: 'Kunne ikke melde dig fra. Prøv igen.',
      skrivBesked: 'Skriv en besked.',
      kunneIkkeSende: 'Kunne ikke sende opdateringen.',
      nogetGikGalt: 'Noget gik galt. Prøv igen.',
    } satisfies Record<EventFejl, string>,
  },
};

export type Ordbog = typeof da;
