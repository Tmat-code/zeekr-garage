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
    talMeldinger: 'Rapporter',
    talBekraeftelser: 'Bekräftelser',
    talModeller: 'Modeller',
    talSendt: 'Skickat till Zeekr',
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
    ingenMeldinger: 'Inga rapporter än - bli den första att rapportera något.',
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
  },
};
