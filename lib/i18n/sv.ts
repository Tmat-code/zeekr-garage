// UI-ordbog: SVENSK. Typet ud fra den danske kilde (da.ts) - tsc fanger
// manglende/overskydende nøgler. Læses igennem af Torben + gerne en svensk
// moderator før en skive kaldes verificeret.

import type { Ordbog } from './da';

export const sv: Ordbog = {
  meta: {
    ogLocale: 'sv_SE',
    titelStandard: (navn) => `${navn} - Inofficiell gemenskap för Zeekr-ägare`,
    beskrivelse:
      'Inofficiell, oberoende gemenskap för Zeekr-ägare i Norden. Rapportera, bekräfta och rösta på mjukvarufel över alla modeller - och samla dem i rapporter till Zeekr.',
    ogAlt: (navn) => `${navn} - inofficiell gemenskap för Zeekr-ägare i Norden`,
    manifestNavn: (navn) => `${navn} - inofficiell gemenskap för Zeekr-ägare`,
    manifestBeskrivelse:
      'Inofficiell, oberoende gemenskap för Zeekr-ägare i Norden - rapportera, bekräfta och rösta på mjukvarufel.',
  },

  ramme: {
    underOpbygning: (navn) =>
      `${navn} är under uppbyggnad - nytt innehåll och nya funktioner kommer löpande.`,
    tagline: 'inofficiell ägargemenskap',
    disclaimer: (domaene) =>
      `${domaene} är en inofficiell, oberoende ägargemenskap. Sidan är inte ansluten till, sponsrad eller godkänd av ZEEKR, Geely eller deras dotterbolag.`,
  },

  nav: {
    forum: 'Forum',
    feedback: 'Feedback',
    events: 'Evenemang',
    ota: 'OTA',
    links: 'Länkar',
    om: 'Om',
    kontakt: 'Kontakt',
    vaerkstedet: 'Verkstaden',
    aabneRapporter: (n) => `${n} öppna forumrapporter`,
    beskeder: 'Meddelanden',
    minGarage: 'Mitt garage',
    logUd: 'Logga ut',
    logInd: 'Logga in',
    aabnMenu: 'Öppna menyn',
    lukMenu: 'Stäng menyn',
  },

  sprog: {
    label: 'Språk',
    feltHjaelp:
      'Språket i menyer, knappar och sidtexter. Inlägg, rapporter och annat användarinnehåll visas på det språk de är skrivna på.',
    gem: 'Spara språk',
    gemmer: 'Sparar…',
    gemt: 'Sparat.',
    fejl: 'Kunde inte spara språket. Försök igen.',
  },

  faelles: {
    alle: 'Alla',
    filtrerModel: 'Filtrera efter modell',
  },

  stem: {
    stemt: 'röstat',
    migMed: 'jag med',
    registrer: 'registrera',
    logIndForAtStemme: 'Logga in för att rösta',
    registrerForAtStemme: 'Registrera din bil i Mitt garage för att rösta',
    rammerIkkeDin: (model) => `Gäller inte din ${model}`,
    rammerIngen: 'Gäller ingen av dina bilar',
    fjernMine: (n) => `Ta bort mina ${n} bekräftelser`,
    fjernMin: 'Ta bort min bekräftelse',
    bekraeftMedDine: (n) => `Bekräfta med dina ${n} bilar (en röst per bil)`,
    bekraeftMedDin: (bil) => `Bekräfta med din ${bil}`,
  },

  config: {
    type: {
      fejl: { navn: 'Fel', flertal: 'fel', badge: 'Fel' },
      oenske: { navn: 'Önskemål', flertal: 'önskemål', badge: 'Önskemål' },
    },
    alvor: {
      lav: 'Låg',
      middel: 'Medel',
      hoej: 'Hög',
      kritisk: 'Kritisk',
    },
    status: {
      ny: 'Ny',
      bekraeftet: 'Bekräftad',
      sendt_til_zeekr: 'Skickad till Zeekr',
      afklaret: 'Klarlagt',
      loest_i_ota: 'Löst i OTA',
    },
    // Samme ordlyd som rapportens sv-labels (lib/rapport-i18n.ts).
    kategori: {
      'koerehjaelp-adas': 'Körhjälp & ADAS',
      'koersel-bremser-understel': 'Körning, bromsar & chassi',
      'opladning-raekkevidde': 'Laddning & räckvidd',
      'skaerm-infotainment': 'Skärm, röst & infotainment',
      'app-laas-forbindelse': 'App, lås & anslutning',
      'lys-ruder-udsyn': 'Ljus, rutor & sikt',
      'klima-saeder-kabine': 'Klimat, säten & kupé',
      'hjul-daek-tpms': 'Hjul, däck & TPMS',
      andet: 'Övrigt',
    },
  },

  tid: {
    datoKommer: 'Datum kommer',
    ligeNu: 'just nu',
    minutter: (n) => `${n} min sedan`,
    timer: (n) => `${n} tim sedan`,
    iGaar: 'i går',
    dage: (n) => `${n} dagar sedan`,
    uger: (n) => `${n} ${n === 1 ? 'vecka' : 'veckor'} sedan`,
    maaneder: (n) => `${n} ${n === 1 ? 'månad' : 'månader'} sedan`,
    aar: (n) => `${n} år sedan`,
  },

  forside: {
    heroLinje1: 'Garaget för',
    heroLinje2: 'Zeekr-ägare i Norden',
    heroTekst:
      'En inofficiell gemenskap där ägare möts, delar erfarenheter och hjälper varandra. Vi samlar fel och önskemål som konstruktiv feedback till Zeekr - för att vi vill se bra bilar bli ännu bättre.',
    vaerMed: 'Var med',
    aabnForum: 'Öppna forumet',
    heroNote: 'Inofficiell ägargemenskap · inte ansluten till eller sponsrad av Zeekr.',
    talMeldinger: 'Ärenden',
    talBekraeftelser: 'Bekräftelser',
    talModeller: 'Modeller',
    talSendt: 'Skickade till Zeekr',
    forumTitel: 'Forumet',
    liveNu: 'Live nu',
    forumTekst:
      'Gemenskapens hjärta: vardagsprat, frågor och guider - med ett eget forum för varje modell, plus laddning, mjukvara, tillbehör och livet som ägare. Samma inloggning som resten av sidan.',
    flereRum: '+ fler rum →',
    opretProfil: 'Skapa en profil för att skriva med →',
    feedbackTitel: 'Feedback',
    aabnFeedback: 'Öppna feedback',
    feedbackTekst:
      'Är redan igång: rapportera fel och önskemål, bekräfta dem tillsammans och rösta upp de viktigaste. Vi samlar dem i konstruktiva rapporter till Zeekr.',
    ingenMeldinger: 'Inga ärenden än - bli den första att rapportera något.',
    trinSoeg: 'Sök först',
    trinBekraeft: 'Bekräfta tillsammans',
    trinSend: 'Skicka till Zeekr',
    garageTitel: 'Mitt garage',
    garageTekst:
      'Registrera din Zeekr, så att dina inlägg i forumet visar rätt bil - och dina röster räknas för rätt modell.',
    registrerBil: 'Registrera din bil',
    linksTitel: 'Användbara länkar',
    linksTekst:
      'Manualer, specifikationer, tester, tillbehör och lite praktiskt - samlat på ett ställe för Zeekr-ägare.',
    seLinks: 'Se användbara länkar',
  },

  om: {
    metaTitel: 'Om',
    titel: (navn) => `Om ${navn}`,
    afsnit1: (navn) =>
      `${navn} är en inofficiell, icke-kommersiell gemenskap av och för Zeekr-ägare i Norden. Inga annonser, inga affiliatelänkar - bara ägare som hjälper varandra.`,
    afsnit2Foer: 'Kärnan är en ',
    afsnit2Fed: 'feltavla',
    afsnit2Efter:
      ': rapportera mjukvarufel, bekräfta dem tillsammans och rösta upp de viktigaste. Ett fel kan taggas till flera modeller, så att vi kan se när något drabbar en hel plattform. De bekräftade felen samlas i snygga, offentliga rapporter till Zeekr - som en konstruktiv medspelare, inte en arg påtryckargrupp.',
    afsnit3Foer: 'Senare kommer ett riktigt ',
    afsnit3Fed: 'forum',
    afsnit3Efter:
      ' med underforum per modell, trådar och guider - med en gemensam inloggning, så att allt känns som en och samma sajt.',
    disclaimerTitel: 'Ansvarsfriskrivning',
  },

  links: {
    titel: 'Användbara länkar',
    metaBeskrivelse:
      'Användbara länkar för Zeekr-ägare: officiellt från Zeekr, tester och specifikationer, köp, tillbehör och praktiskt. Filtrera efter din modell.',
    intro:
      'Saker vi själva använder som Zeekr-ägare: officiellt från Zeekr, tester och specifikationer, köp och tillbehör, och lite praktiskt. Filtrera på din modell, så ser du det som passar just din bil - länkar utan modell gäller alla.',
    note: 'Vi tjänar inget på någon av länkarna. Externa sidor öppnas i en ny flik.',
  },

  software: {
    titel: 'OTA-historik',
    metaBeskrivelse:
      'Mjukvaru- och OTA-uppdateringar för Zeekr-modellerna: version, datum och ändringslogg per modell. Underhålls av ägare - nyaste versionen överst.',
    intro:
      'Mjukvaru- och OTA-uppdateringar per modell: version, datum och vad som kom i den. Välj din modell och fäll ut en version för att se ändringsloggen. Nyaste versionen står överst.',
    noteFoer: 'Underhålls av oss ägare. Vill du diskutera en uppdatering, ta det i',
    noteLink: 'ditt modellforum',
    noteEfter: '- varje version nedan länkar direkt dit.',
    aendringer: (n) => `${n} ${n === 1 ? 'ändring' : 'ändringar'}`,
    ingenPunkter: 'Inga punkter angivna.',
    diskuter: (model) => `Diskutera i ${model}-forumet`,
    tomTitel: 'Inga OTA-uppdateringar har loggats ännu.',
    tomTekst: 'Historiken fylls på i takt med att modellerna får uppdateringar.',
    nyeste: 'Senaste:',
    oversatFraDansk: 'Översatt från danska · maskinöversatt',
    visOriginal: 'Visa original',
    visOversaettelse: 'Visa översättning',
  },
  // ===== U3: Feedback + kontakt =====
  faellesFejl: {
    nogetGikGalt: 'Något gick fel. Försök igen.',
    annuller: 'Avbryt',
    valgfri: '(valfri)',
    valgfrit: '(valfritt)',
    logInd: 'Logga in',
  },

  oversatTitel: {
    sprogNavn: { da: 'danska', sv: 'svenska', en: 'engelska' },
    oversatFra: (sprog) => `Översatt från ${sprog} · maskinöversatt`,
    visOriginal: 'Visa original',
    visOversaettelse: 'Visa översättning',
  },

  feedback: {
    metaTitel: 'Feedback',
    titel: 'Feedback',
    intro:
      'Rapportera fel och önskemål, bekräfta dem tillsammans och rösta upp de viktigaste. Vi samlar dem i konstruktiva rapporter till Zeekr - som en medspelare som vill se bra bilar bli ännu bättre.',
    meldFejl: 'Rapportera ett fel',
    foreslaaOenske: 'Föreslå ett önskemål',
    logIndForAtBidrage: 'Logga in för att bidra',
    note: 'Alla kan läsa. Inloggning krävs bara för att rapportera, bekräfta eller kommentera.',
    alleModeller: 'Alla modeller',
    status: 'Status',
    aktive: 'Aktiva',
    afsluttet: 'Avslutade',
    type: 'Typ',
    fejlFane: 'Fel',
    oenskerFane: 'Önskemål',
    soegPlaceholder: 'Sök bland ärenden…',
    soegHjaelp: 'Sökningen hittar även ärenden skrivna på andra språk.',
    kategoriAria: 'Filtrera på kategori',
    alleKategorier: 'Alla kategorier',
    antal: (n, type) =>
      type === 'oenske'
        ? `${n} önskemål`
        : type === 'fejl'
          ? `${n} fel`
          : `${n} ${n === 1 ? 'ärende' : 'ärenden'}`,
    flestStemmer: 'Flest röster',
    nyeste: 'Nyaste',
    tomTitel: 'Inga ärenden här än',
    tomFoerste: 'Bli den första att rapportera.',
    tomFilter: 'Inget matchar filtret än - prova ett annat.',
    meldInd: 'Rapportera',
    svar: (n) => `${n} svar`,
    seBilleder: 'Se bilderna på ärendet',
    detaljer: 'Detaljer →',
    rammerHele: (platform) => `gäller hela ${platform}`,
  },

  meld: {
    metaTitel: 'Rapportera',
    titel: 'Rapportera',
    intro: 'Sök först - då undviker vi dubbletter, och de verkliga felen får fler röster.',
    hvadVilDuMelde: 'Vad vill du rapportera?',
    vaelgFoer: 'Välj om det är ett ',
    vaelgFejl: 'fel',
    vaelgMidt: ' (något som inte fungerar) eller ett ',
    vaelgOenske: 'önskemål',
    vaelgEfter: ' om ny funktionalitet.',
    enFejl: 'Ett fel',
    enFejlTekst: 'Något i bilen fungerar inte som det ska.',
    etOenske: 'Ett önskemål',
    etOenskeTekst: 'En funktion eller förbättring som du önskar att Zeekr lägger till.',
    trinSoeg: '1. Sök',
    trinTjek: '2. Kolla',
    trinUdfyld: (n) => `${n}. Fyll i`,
    soegTitel: (oenske) => `Först: är ${oenske ? 'önskemålet' : 'felet'} redan rapporterat?`,
    soegTekst: (oenske) =>
      `Sök efter ${oenske ? 'ditt önskemål' : 'felet'}. Finns det något som liknar, ge det ett "jag med" i stället - det väger tyngre än en ny dubblett. Sökningen hittar även ärenden på danska och engelska.`,
    phFejl: "T.ex. 'laddningen avbryts'…",
    phOenske: "T.ex. 'trådlös CarPlay'…",
    soeg: 'Sök',
    findesHerunder: 'Finns det här nedanför? Ge det i så fall ett "jag med" i stället.',
    ingenErDin: (oenske) => `Är inget av dem ${oenske ? 'ditt önskemål' : 'ditt fel'}?`,
    nejNy: (oenske) => `Nej, ${oenske ? 'mitt önskemål' : 'mitt fel'} är nytt → fortsätt`,
    ingenMatch: (oenske) =>
      `Ingen träff - ${oenske ? 'ditt önskemål' : 'ditt fel'} verkar vara nytt.`,
    fortsaet: 'Fortsätt →',
    tilbageBoard: '← Tillbaka till listan',
    vaelgTypeIgen: '← Välj typ igen',
    tjekTitel: 'Snabbkoll först',
    tjekFoer: 'Har du provat att ',
    tjekGenstart: 'starta om skärmen',
    tjekMidt: ' och kollat att du har ',
    tjekOta: 'senaste OTA',
    tjekEfter: '? En del mjukvarustrul försvinner efter en omstart eller en uppdatering - då slipper vi dubbletter.',
    jaLoeste: 'Ja - och det löste det',
    jaLoesteSub: 'Då behöver vi inte rapportera det. Tack!',
    nejStadig: 'Nej - felet finns kvar',
    nejStadigSub: 'Då rapporterar vi det ordentligt →',
    tilbageSoeg: '← Tillbaka till sökningen',
    fejlTitel: (oenske) => `Ge ${oenske ? 'önskemålet' : 'felet'} en kort, tydlig rubrik.`,
    fejlBeskriv: (oenske) => `Beskriv ${oenske ? 'önskemålet' : 'felet'} lite mer.`,
    fejlModel: (oenske) =>
      `Välj minst en modell som ${oenske ? 'önskemålet gäller' : 'felet påverkar'}.`,
    fejlKategori: 'Välj en kategori - ta "Övrigt" om ingen passar.',
    fejlSoftware:
      'Skriv vilken mjukvaruversion (OTA) du har - det är viktigt som bevis över alla bilar.',
    fraForum: (oenske) =>
      `📌 Skapat utifrån en forumtråd - rubrik och text är förifyllda. Kontrollera och lägg till modell(er)${oenske ? '' : ' + mjukvaruversion'}, så att felet blir strukturerad feedback.`,
    aabnTraaden: 'Öppna tråden',
    titelLabel: 'Rubrik',
    titelPhFejl: 'Kartmodulen fryser vid start i kallt väder',
    titelPhOenske: 'Trådlös CarPlay',
    beskrivelse: 'Beskrivning',
    beskrPhFejl: 'Vad händer, när, och hur återskapar man det?',
    beskrPhOenske: 'Vad önskar du, och varför skulle det göra bilen bättre?',
    sprogNote:
      'Skriv gärna på svenska, danska eller engelska - vi översätter till rapporten och listan.',
    billeder: 'Bilder',
    billedHjaelpFejl:
      'Fotobevis väger tungt gentemot Zeekr - skärmbild av felmeddelande/OTA-skärm, en fysisk defekt eller en logg.',
    billedHjaelpOenske: 'Bifoga t.ex. en skiss eller ett exempel på funktionen.',
    software: 'Mjukvaruversion (OTA)',
    softwarePh: 't.ex. OS 1.3.0',
    kategori: 'Kategori',
    vaelgKategori: '- välj kategori -',
    alvor: 'Allvarlighetsgrad',
    telefon: 'Telefon',
    telefonValgfrit: '- valfritt',
    telefonHjaelp:
      'Fyll bara i om felet gäller telefonen (CarPlay, Android Auto, Bluetooth, appen). Det hjälper oss att hitta mönster mellan olika telefoner.',
    telefonModel: 'Telefonmodell',
    telefonModelPh: 't.ex. iPhone 15 Pro / Samsung S24',
    telefonOs: 'Telefonens OS',
    telefonOsPh: 't.ex. iOS 18.1 / Android 15',
    modeller: (oenske) =>
      oenske ? 'Vilka modeller gäller önskemålet?' : 'Vilka modeller påverkas av felet?',
    modellerHjaelp: 'Välj gärna flera - gäller det hela plattformen väger det tyngre.',
    sender: 'Skickar…',
    submit: (oenske) => (oenske ? 'Föreslå önskemålet' : 'Rapportera felet'),
  },

  melding: {
    tilbage: '← Tillbaka till listan',
    meldt: (dato, n) =>
      `Rapporterat ${dato} · 🚗 ${n} ${n === 1 ? 'bil bekräftad' : 'bilar bekräftade'}`,
    saadanOpleves: 'Så upplevs felet',
    oensket: 'Önskemålet',
    fotoBevis: 'Fotobevis',
    billeder: 'Bilder',
    billede: 'Bild',
    oplever: 'Upplever du också detta?',
    oplevTekst: 'Bekräfta med din variant - ju fler ägare, desto tyngre väger felet gentemot Zeekr.',
    udenVariant: 'Utan variant',
  },

  kommentarer: {
    titel: (n) => `💬 Byggmöte (${n})`,
    intro:
      'Är det ett handhavandefel, eller har du en lösning? Hjälp de andra här - så fångas ett användarfel innan det hamnar i rapporten till Zeekr.',
    ingen: 'Inga kommentarer än. Bli den första.',
    ejer: 'Ägare',
    markeretLoesning: '✅ Markerad som lösning',
    gem: 'Spara',
    skrivPrivat: '✉️ Skriv privat',
    fjernLoesning: 'Ta bort lösning',
    markerLoesning: '✅ Markera som lösning',
    ret: '✏️ Redigera',
    slet: '🗑 Radera',
    bekraeftSlet: 'Radera den här kommentaren?',
    ph: "T.ex.: 'Det här är faktiskt en inställning - gå in i menyn under…'",
    send: 'Skicka kommentar',
    kunneIkkeSende: 'Kunde inte skicka.',
    forAtKommentere: ' för att kommentera.',
    logIndFoerst: 'Logga in för att kommentera.',
    skrivEn: 'Skriv en kommentar.',
    forLang: 'Kommentaren är för lång.',
    maaIkkeVaereTom: 'Kommentaren får inte vara tom.',
    kunModerator: 'Endast moderator/admin.',
  },

  kontakt: {
    metaTitel: 'Kontakt',
    titel: 'Kontakta teamet',
    intro:
      'Något som inte hör hemma offentligt? Skriv direkt och privat till oss - t.ex. ett klagomål på en annan användare, något om säkerhet eller personuppgifter, eller något personligt. Meddelandet når bara teamet, inte forumet.',
    henvisFoer: 'Har du i stället hittat ett ',
    henvisFejl: 'fel på bilen',
    henvisMidt: ' eller ett önskemål, använd ',
    henvisLink: 'Rapportera ett fel',
    henvisEfter: '. Önskemål eller fel på ',
    henvisSiden: 'själva sidan',
    henvisSlut: ' hör hemma i forumgruppen "Om Zeekr Garage".',
    logIndTitel: 'Logga in för att skriva till teamet',
    logIndTekst:
      'Kanalen är till för inloggade ägare, så att vi vet vem vi pratar med och slipper spam.',
    emne: 'Ämne',
    emnePh: 'Kort rubrik',
    besked: 'Meddelande',
    beskedPh: 'Beskriv vad det gäller. Ju mer konkret, desto bättre kan vi hjälpa till.',
    svarMail: 'Svarsadress',
    svarMailPh: 'du@exempel.se',
    svarMailHjaelp:
      'Fyll i om du vill ha svar på en viss e-postadress. Ditt namn och ditt konto följer automatiskt med.',
    sender: 'Skickar...',
    send: 'Skicka meddelande',
    takSendt: 'Tack - ditt meddelande är skickat. 🙌',
    sendtTekst: (mail) =>
      `Teamet får besked och återkommer${mail ? ` till ${mail}` : ' om det behövs'}. Meddelandet är privat och syns bara för teamet - inte på forumet.`,
    skrivEnTil: 'Skriv ett till',
    tilForsiden: 'Till startsidan',
    udfyldBegge: 'Fyll i både ämne och meddelande.',
    logIndFoerst: 'Logga in för att skicka ett meddelande.',
    emneForLangt: 'Ämnet är för långt (max 160 tecken).',
    beskedForLang: 'Meddelandet är för långt (max 4000 tecken).',
    mailForkert: 'Svarsadressen ser inte rätt ut.',
  },

  bil: {
    vaelgModel: 'Välj modell…',
    vaelgVariant: 'Välj variant…',
    ejerIkke: 'Äger ingen Zeekr än',
  },
};

