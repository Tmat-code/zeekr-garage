// UI-i18n U6: Værkstedets moderator-del på SVENSK. Typet ud fra da.ts.
// Termer: Værkstedet = Verkstaden, melding = ärende, Anmeldelser = Anmälningar,
// Adgange = Behörigheter, suspendér = stäng av, håndteret/behandlet = hanterad.

import type { VOrdbog } from './da';

export const vsv: VOrdbog = {
  navn: 'Verkstaden',
  metaTitel: (side) => `${side} - Verkstaden`,

  ramme: {
    loggetIndSom: 'Inloggad som',
    tilForsiden: '← Till startsidan',
    logUd: 'Logga ut',
    tilbage: '← Tillbaka till Översikt',
  },

  roller: {
    superadmin: 'superadmin',
    admin: 'admin',
    moderator: 'moderator',
  },

  nav: {
    overblik: 'Översikt',
    feedback: 'Feedback',
    rapport: 'Rapport',
    forum: 'Forum',
    links: 'Länkar',
    ota: 'OTA',
    anmeldelser: 'Anmälningar',
    kontakt: 'Kontakt',
    aktivitet: 'Aktivitet',
    adgange: 'Behörigheter',
    audit: 'Audit',
    manual: 'Manual',
    aabneRapporter: (n) => `${n} öppna forumrapporter`,
  },

  genveje: {
    titel: 'Genvägar',
    feedback: 'Moderera ärenden + städning',
    forum: 'Trådar, kategorier och regler',
    anmeldelser: 'Anmälda privata meddelanden',
    kontakt: 'Privata förfrågningar till personalen',
    rapport: 'Sammanställ Zeekr-rapport (PDF/CSV)',
    aktivitet: 'Mönster över tid',
    adgange: 'Användare och roller',
    links: 'Användbara länkar på /links',
  },

  overblik: {
    titel: 'Översikt',
    aabn: (omraade) => `Öppna ${omraade}`,
    meldinger: 'Ärenden totalt',
    bekraeftelser: 'Bekräftelser totalt',
    aabne: 'Öppna (ny + bekräftad)',
    loestIOta: 'Löst i OTA',
    kategorier: 'Kategorier',
    traade: 'Trådar',
    indlaeg: 'Inlägg',
  },

  faelles: {
    iAlt: (n) => `${n} totalt`,
    viser: (vist, total) => `Visar ${vist} av ${total}`,
    visFlere: 'Visa fler',
    ny: 'Ny',
    ejer: 'Ägare',
    enEjer: 'En ägare',
    fortryd: 'Ångra',
    bekraeftSlet: 'Bekräfta borttagning',
    soeg: 'Sök',
    alle: 'Alla',
  },

  feedback: {
    alleMeldinger: 'Alla ärenden',
    senesteAktivitet: 'Senaste feedback-aktivitet',
    aktivitetIntro: 'Nya ärenden och bekräftelser.',
    ingenAktivitet: 'Ingen feedback-aktivitet än.',
    ingenMeldinger: 'Inga ärenden än.',
    flereHandlinger: 'Fler åtgärder',
    titelPh: 'Rubrik',
    beskrivelsePh: 'Beskrivning',
    gem: 'Spara',
    annuller: 'Avbryt',
    seKommentarer: 'Se kommentarer',
    svar: (n) => `${n} svar`,
    status: 'Status',
    alvor: 'Allvar',
    kategori: 'Kategori',
    sprog: 'Språk',
    sprogTitle: 'Ärendets originalspråk - styr översättningen av rapporten och rubrikerna',
    ingenKategori: '- ingen -',
    sletSpoerg: 'Ta bort det här ärendet?',
    loestHvordan: 'Löst hur?',
    loestIOta: '✅ Löst i OTA',
    loestIOtaTitle: 'Zeekr har åtgärdat det i en mjukvaruuppdatering',
    afklaret: '💬 Klarlagt',
    afklaretTitle: 'Avslutat utan OTA-fix, t.ex. felinformerad användare eller klarlagt i en kommentar',
    markerLoest: '✅ Markera som löst',
    rediger: '✏️ Redigera',
    slet: '🗑 Ta bort',
    // P43: slå ihop dubbletter
    laegSammen: '🔗 Slå ihop med...',
    samlTitel: 'Lägg det här ärendet under originalet',
    samlIntro:
      'Välj det ärende som ska behållas. Röster (en per bil), kommentarer och bilder flyttas dit, originalet ärver modellerna och det här ärendet döljs. Kan ångras.',
    samlSoegPh: 'Sök efter originalet (rubrik, även på de andra språken)',
    samlIngenTraef: 'Inga ärenden matchar.',
    samlVaelg: 'Välj',
    samlBekraeft: (dublet, original) => `Lägga "${dublet}" under "${original}"?`,
    samlKnap: '🔗 Slå ihop',
    samlImporteret:
      'Importerat från bugherrer - kan inte vara dubbletten före cutover. Lägg i stället det andra ärendet under det här.',
    stemmer: (n) => `${n} ${n === 1 ? 'röst' : 'röster'}`,
    sammenlagtTitel: 'Ihopslagna dubbletter',
    sammenlagtIntro:
      'Dubbletter som har lagts under ett original. De är dolda överallt (tavlan, sökningen, rapporten). Ångra flyttar tillbaka röster, kommentarer och bilder.',
    ingenSammenlagte: 'Inga ihopslagna dubbletter.',
    dublet: 'Dubblett',
    original: 'Original',
    flyttet: (s, d, k, b) =>
      `${s} ${s === 1 ? 'röst' : 'röster'} flyttade` +
      (d > 0 ? ` (${d} från samma bil borttagna)` : '') +
      ` · ${k} ${k === 1 ? 'kommentar' : 'kommentarer'} · ${b} ${b === 1 ? 'bild' : 'bilder'}`,
    af: (navn, dato) => `${navn ?? 'Okänd'} · ${dato}`,
    fortrydKnap: '↩ Ångra',
    fortrydSpoerg: 'Ångra sammanslagningen?',
  },

  aktivitetFeed: {
    nyMelding: 'Nytt ärende:',
    bekraeftelsePaa: 'Bekräftelse på',
    nyTraad: 'Ny tråd:',
    nytSvarI: 'Nytt svar i',
    enMelding: 'ett ärende',
    enTraad: 'en tråd',
    ingen: 'Ingen aktivitet än.',
  },

  forumSide: {
    rapporterTitel: 'Inkomna rapporter',
    ingenAabne: 'inga öppna',
    aabne: (n) => `${n} öppna`,
    rapporterIntro:
      'Innehåll som användare (eller senare AI) har flaggat. Ta bort tråden/inlägget med en anledning (författaren får ett officiellt meddelande), varna författaren eller avvisa rapporten. En åtgärd härifrån markerar rapporten som hanterad.',
    modTitel: 'Forummoderering',
    modTaeller: (traade, indlaeg) => `${traade} trådar · ${indlaeg} inlägg`,
    modIntro:
      'Fäst, lås eller ta bort trådar och inlägg. Åtgärderna slår igenom i forumet direkt. Sök eller filtrera fram det som kräver uppmärksamhet, och hämta fler med "Visa fler".',
    aktivitetTitel: 'Senaste forumaktivitet',
    aktivitetIntro: 'Nya trådar och svar i forumet.',
    ingenAktivitet: 'Ingen forumaktivitet än.',
  },

  forumMod: {
    harRapportTitle: 'Har en öppen rapport',
    rapportMaerke: '⚑ rapport',
    spaerretTitle: 'Författaren är spärrad just nu',
    spaerretMaerke: '🚫 spärrad',
    fastgjort: 'Fäst',
    laast: 'Låst',
    svar: (n) => `${n} svar`,
    visninger: (n) => (n === 1 ? '1 visning' : `${n} visningar`),
    fjernFastgoer: 'Lossa',
    fastgoer: '📌 Fäst',
    laasOp: 'Lås upp',
    laas: '🔒 Lås',
    fjernTraad: '🗑 Ta bort tråd',
    fjernTraadSubmit: 'Ta bort tråd + meddela',
    iTraad: 'i',
    aabning: '(start)',
    aabningsIndlaeg: 'Startinlägg - använd "Ta bort tråd"',
    fjern: '🗑 Ta bort',
    fjernIndlaegSubmit: 'Ta bort inlägg + meddela',
    soegLabel: 'Sök i rubrik eller författare',
    soegPh: 't.ex. däcktryck eller ett namn',
    vis: 'Visa',
    kraeverOpm: '⚑ Kräver uppmärksamhet',
    opmForklaring:
      '"Kräver uppmärksamhet" = trådar/inlägg som antingen har en öppen rapport eller är skrivna av en användare som är spärrad just nu.',
    traadeOverskrift: (vist, total) => `Trådar (visar ${vist} av ${total})`,
    indlaegOverskrift: (vist, total) => `Inlägg (visar ${vist} av ${total})`,
    ingenTraadeMatcher: 'Inga trådar matchar.',
    ingenTraade: 'Inga trådar än.',
    ingenIndlaegMatcher: 'Inga inlägg matchar.',
    ingenIndlaeg: 'Inga inlägg än.',
    visFlereTraade: 'Visa fler trådar',
    visFlereIndlaeg: 'Visa fler inlägg',
    kunneIkkeHenteTraade: 'Kunde inte hämta trådar.',
    kunneIkkeHenteIndlaeg: 'Kunde inte hämta inlägg.',
  },

  rapporter: {
    indlaeg: 'Inlägg',
    traad: 'Tråd',
    grund: (grund) => `Anledning: ${grund}`,
    aiFlag: 'AI-flagga',
    rapporteretAf: (navn) => `· rapporterad av ${navn}`,
    alleredeFjernet: 'redan borttagen',
    forfatter: (navn) => `· författare: ${navn}`,
    fjernIndlaeg: '🗑 Ta bort inlägg',
    fjernTraad: '🗑 Ta bort tråd',
    advarForfatter: '🛡 Varna författaren',
    afvis: 'Avvisa rapport',
    fjernIndlaegSubmit: 'Ta bort inlägg + meddela',
    fjernTraadSubmit: 'Ta bort tråd + meddela',
    sendAdvarsel: 'Skicka varning',
    ingenAabne: 'Inga öppna rapporter. 🎉',
    visFlere: 'Visa fler rapporter',
    kunneIkkeHente: 'Kunde inte hämta rapporter.',
  },

  anmeldelser: {
    titel: 'Anmälningar',
    intro:
      'Anmälda privata meddelanden. Du ser bara det som någon har anmält - inte övriga konversationer. Markera som hanterat, eller ta bort ett meddelande som bryter mot reglerna.',
    haandteret: 'Hanterad',
    anmeldtAf: (navn, tid) => `Anmäld av ${navn} · ${tid}`,
    begrundelse: 'Motivering:',
    ingenBegrundelse: 'Ingen motivering angiven.',
    skrev: (navn) => `${navn} skrev`,
    beskedSlettet: 'Meddelandet är borttaget. Anmälan finns kvar som historik.',
    helSamtale: 'Hela konversationen är anmäld (inget enskilt meddelande utpekat).',
    aabnSamtale: 'Öppna konversationen',
    markerNy: 'Markera som ny',
    markerHaandteret: '✓ Markera som hanterad',
    sletBesked: '🗑 Ta bort meddelande',
    nye: (n) => `${n} nya`,
    haandterede: (n) => `${n} hanterade`,
    visKunNye: 'Visa bara nya',
    visAlle: 'Visa alla',
    ingenEndnu: 'Inga anmälningar än.',
    ingenNye: 'Inga nya anmälningar. Allt är hanterat. 👍',
  },

  kontakt: {
    henvendelser: 'Förfrågningar',
    ingenEndnuTaeller: 'inga än',
    intro:
      'Privata meddelanden från ägare via kontaktsidan - klagomål på en användare, säkerhet/personuppgifter eller något personligt. Syns bara för personalen.',
    behandlet: 'Hanterad',
    markerUbehandlet: '↩ Markera som ohanterad',
    markerBehandlet: '✓ Markera som hanterad',
    visFlere: 'Visa fler förfrågningar',
    ingen: 'Inga förfrågningar än. 🎉',
    kunneIkkeHente: 'Kunde inte hämta förfrågningar.',
  },

  aktivitet: {
    titel: 'Aktivitet',
    intro:
      'Tillväxt och engagemang - unika aktiva användare och nya användare per dag, senaste 30 dagarna (dansk tid).',
    aktive30: 'Aktiva (30 dagar)',
    nye30: 'Nya användare (30 dagar)',
    brugereIAlt: 'Användare totalt',
    aktivePrDag: 'Aktiva användare per dag',
    aktiveForklaring:
      'Unika användare som gjorde något den dagen: röstade, rapporterade, skrev i forumet (tråd eller svar) eller skickade ett meddelande.',
    ingenData: 'Ingen registrerad aktivitet under perioden än.',
    nyePrDag: 'Nya användare per dag',
    nyeForklaring: 'Registreringar (skapade profiler).',
    iDag: 'i dag',
    deploy: (roligst, travlest) =>
      `🔧 Deploy-tidpunkt: lugnast runt kl. ${roligst}${
        travlest ? ` (mest trafik kl. ${travlest})` : ''
      } - de lugna timmarna är säkrast att deploya (kort driftstopp drabbar färre).`,
    serverNote:
      '💡 Det här är gemenskapens aktivitet (användare som använder sajten) - inte serverns CPU/minne. Den faktiska serverbelastningen ser du i Coolifys egen övervakning av applikationen.',
  },

  brugere: {
    adgangeTitel: 'Behörigheter',
    titel: 'Användare',
    intro: (erAdmin) =>
      `Översikt över alla registrerade användare. Sök och filtrera, och agera på en användare: varna eller stäng av${
        erAdmin ? ', bannlys, häv eller anonymisera' : ''
      }. Varje åtgärd ger användaren ett officiellt meddelande med anledningen och hamnar i modereringsloggen.`,
    dage: (n) => (n === 1 ? '1 dag' : `${n} dagar`),
    aktiv: 'Aktiv',
    suspenderetTil: (dato) => `Avstängd till ${dato}`,
    suspenderet: 'Avstängd',
    anonymiseret: 'Anonymiserad',
    bannet: 'Bannlyst',
    ingenRolle: 'ingen roll',
    anonymiseretNavn: '(anonymiserad)',
    dig: '(du)',
    oprettet: (tid) => `skapad ${tid}`,
    sidstLogget: (tid) => `senast inloggad ${tid}`,
    aldrigLogget: 'aldrig inloggad',
    advar: '🛡 Varna',
    suspender: '⏸ Stäng av',
    ban: '⛔ Bannlys',
    ophaev: '✅ Häv spärren',
    anonymiser: '👤 Anonymisera',
    egenKonto: 'Du kan inte sanktionera ditt eget konto.',
    maalErAdmin: 'En admin kan inte sanktioneras - ta bort admin-rollen först.',
    kontoAnonymiseret: 'Kontot är anonymiserat.',
    sendAdvarsel: 'Skicka varning',
    varighed: 'Längd:',
    suspenderSubmit: 'Stäng av + meddela',
    banForklaring:
      'Permanent skrivspärr. Användaren kan fortfarande läsa men inte bidra. Kan hävas igen.',
    banSubmit: 'Bannlys + meddela',
    anonymForklaring: 'Raderar personuppgifter (namn, e-post, VIN/anteckningar) och spärrar permanent.',
    anonymForklaring2:
      'Bilar, bekräftelser och foruminlägg behålls (de är QA-signalen) - men visas utan författare. Åtgärden kan inte ångras.',
    anonymSubmit: 'Anonymisera personen',
    navnEllerEmail: 'Namn eller e-post',
    soegPh: 't.ex. Mette eller mette@...',
    rolle: 'Roll',
    udenRolle: 'Utan roll',
    rolleModerator: 'Moderator',
    rolleAdmin: 'Admin',
    status: 'Status',
    sorter: 'Sortera',
    nyeste: 'Nyaste',
    sidstAktive: 'Senast aktiva',
    navn: 'Namn',
    ingenMatcher: 'Inga användare matchar.',
    kunneIkkeHente: 'Kunde inte hämta användare.',
  },

  fejl: {
    ingenAdgang: 'Du har inte behörighet att göra det.',
    ugyldigStatus: 'Ogiltig status.',
    ugyldigAlvor: 'Ogiltig allvarsgrad.',
    ugyldigKategori: 'Ogiltig kategori.',
    ugyldigtSprog: 'Ogiltigt språk.',
    tomTitel: 'Rubriken får inte vara tom.',
    ugyldigGrund: 'Ogiltig anledning.',
    ugyldigeDage: 'Antal dagar måste vara mellan 1 och 3650.',
    egenKonto: 'Du kan inte sanktionera ditt eget konto.',
    maalErAdmin: 'En admin eller superadmin kan inte sanktioneras - ta bort rollen först.',
    brugerFindesIkke: 'Användaren finns inte.',
    henvendelseFindesIkke: 'Förfrågan finns inte längre.',
    meldingFindesIkke: 'Ärendet finns inte längre.',
    samlSelv: 'Ett ärende kan inte slås ihop med sig självt.',
    samlImporteret: 'Ett importerat bugherrer-ärende kan inte vara dubbletten före cutover.',
    samlAllerede: 'Ärendet är redan ihopslaget.',
    samlOriginalSkjult: 'Originalet är självt ihopslaget med ett annat ärende - välj det i stället.',
    samlHarIndlagte: 'Det här ärendet har själv fått dubbletter inlagda - ångra dem först, eller använd det som original.',
    samlTypeForskel: 'Ett fel och ett önskemål kan inte slås ihop.',
    sammenlaegningFindesIkke: 'Sammanslagningen finns inte längre.',
    alleredeFortrudt: 'Sammanslagningen är redan ångrad.',
    fortrydManuelt: 'Dubbletten pekar inte längre på originalet - ångra manuellt.',
    nogetGikGalt: 'Något gick fel. Försök igen.',
  },

  manual: {
    titel: 'Manual',
    intro: 'Uppslagsverk för hur Verkstaden fungerar - sida för sida.',
    adminManual: 'Admin-manual',
    modManual: 'Moderatormanual',
    serAdmin: 'Du ser admin-manualen - allt i Verkstaden (på danska).',
    serMod: 'Du ser moderatormanualen - exakt det en moderator ser. Bra för introduktion.',
    kort: [
      {
        ikon: '🚗',
        titel: 'Vad är Zeekr Garage',
        blokke: [
          {
            p: 'Zeekr Garage är en oberoende, inofficiell gemenskap för Zeekr-ägare i Norden. Sajten har två halvor: **feedback-tavlan**, där ägare rapporterar fel och önskemål och andra trycker "jag med" för att lägga en röst (ett _ärende_), och **forumet**, där man pratar (trådar och svar).',
          },
          {
            p: 'Poängen med alltihop: de bästa, mest bekräftade ärendena samlas i en **rapport till Zeekr** - professionell, strukturerad ägarfeedback. Ju renare och mer civiliserad tavla och forum, desto starkare blir rapporten. Det är det modereringen tjänar - inte att patrullera, utan att hålla signalen skarp.',
          },
          { p: '**Verkstaden** (här) är bakom kulisserna, där det arbetet sker.' },
          {
            liste: [
              {
                navn: 'Var forumrapporterna kommer ifrån',
                tekst:
                  'Användarna trycker ⚑ ute i själva forumet; det flaggade innehållet hamnar i rapportkön högst upp på fliken Forum. (Blanda inte ihop de två sorternas "rapport": en _forumrapport_ är en anmälan från en användare - _rapporten till Zeekr_ är den samlade feedbacken som skickas vidare.)',
              },
            ],
          },
        ],
      },
      {
        ikon: '🧭',
        titel: 'Så hänger Verkstaden ihop',
        blokke: [
          {
            p: 'Verkstaden är bakom kulisserna på Zeekr Garage - här håller vi forumet och feedback-ärendena civiliserade och användbara, så att den feedback ägarna ger blir en stark rapport till Zeekr.',
          },
          {
            p: 'Som moderator sköter du det dagliga: forumrapporter, trådar och inlägg, anmälda meddelanden, privata förfrågningar, feedback-ärenden och varningar/avstängningar. Den här manualen täcker allt.',
          },
          {
            liste: [
              {
                navn: 'Navigering',
                tekst:
                  'Flikraden överst följer sidorna: Översikt, Feedback, Rapport, Forum, Anmälningar, Kontakt, Aktivitet, Behörigheter och Manual. Fliken Forum får en liten kopparsiffra när det finns öppna rapporter.',
              },
              {
                navn: 'Grundregel',
                tekst:
                  'Varje åtgärd som drabbar en användare - ta bort med anledning, varning, avstängning - skickar ett officiellt meddelande med anledningen till personen och hamnar i modereringsloggen. Inga tysta borttagningar.',
              },
              {
                navn: 'Anledningar',
                tekst:
                  'De fasta anledningarna är Dubblett, Ton / personangrepp, Off-topic, Spam och Annat. Du kan alltid förtydliga i fritextfältet.',
              },
              {
                navn: 'Språk',
                tekst:
                  'Verkstaden följer ditt språk (väljs i sidfoten eller i Mitt garage). Användarnas innehåll - ärenden, inlägg, meddelanden, förfrågningar - visas på det språk det är skrivet på. Kategori- och regelredigeraren på fliken Forum och fliken Rapport finns bara på danska.',
              },
            ],
          },
        ],
      },
      {
        ikon: '🧰',
        titel: 'Typiska situationer - så gör du',
        blokke: [
          {
            p: 'Från "det här händer" till "var + vad". Saknar du detaljerna står de under respektive sida längre ner.',
          },
          {
            situationer: [
              {
                naar: 'Ett inlägg eller en tråd är otrevlig eller ett personangrepp',
                tekst:
                  'Är det redan anmält: fliken Forum → rapportkön överst → 🗑 Ta bort med anledning (eller 🛡 Varna författaren). Annars: Forummoderering → sök fram tråden/inlägget → 🗑 Ta bort med anledning. Författaren får automatiskt ett meddelande.',
              },
              {
                naar: 'En användare spammar eller fortsätter',
                tekst:
                  'Behörigheter → hitta användaren → 🛡 Varna först; fortsätter det, ⏸ Stäng av (välj antal dagar).',
              },
              {
                naar: 'Två trådar om samma fel (dubblett)',
                tekst:
                  'Forummoderering → Ta bort den ena med anledningen Dubblett, och skriv länken till originalet i förtydligandefältet.',
              },
              {
                naar: 'Ett privat meddelande har anmälts',
                tekst:
                  'Fliken Anmälningar → läs det → ✓ Markera som hanterad, eller 🗑 Ta bort meddelande om det bryter mot reglerna.',
              },
              {
                naar: 'En ägare har skrivit till personalen via Kontakt',
                tekst:
                  'Fliken Kontakt → läs förfrågan, svara ev. via e-postlänken (om personen har angett en e-post) → ✓ Markera som hanterad.',
              },
              {
                naar: 'Ett ärende är felklassat eller behöver stramas upp',
                tekst:
                  'Fliken Feedback → ändra Status/Allvar/Kategori/Språk på raden, eller ✏️ Redigera rubrik och beskrivning under ⋯-menyn.',
              },
              {
                naar: 'Zeekr har åtgärdat ett fel i en uppdatering',
                tekst: 'Fliken Feedback → hitta ärendet → ✅ Markera som löst → Löst i OTA.',
              },
              {
                naar: 'Samma fel är rapporterat två gånger (t.ex. på danska och svenska)',
                tekst:
                  'Fliken Feedback → ⋯ på det nyaste/minsta → 🔗 Slå ihop med... → välj originalet. Då samlas rösterna på ett ärende inför Zeekr.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📊',
        titel: 'Översikt (startsidan)',
        blokke: [
          {
            p: 'Startsidan i Verkstaden. Siffror för Feedback (ärenden, bekräftelser, öppna, lösta i OTA) och Forum (kategorier, trådar, inlägg), plus ett rutnät med genvägar till alla sidor. Ren översikt - du agerar inte här.',
          },
        ],
      },
      {
        ikon: '🗒️',
        titel: 'Feedback - ärenden',
        blokke: [
          {
            p: 'Alla ägarnas ärenden, sorterade med flest röster överst. Varje rad visar antal röster, rubrik, typ (fel eller önskemål), modell och ev. mjukvaruversion, samt en länk till kommentarerna om det finns några.',
          },
          { afsnit: 'Så gör du' },
          {
            liste: [
              {
                navn: 'Klassificera',
                tekst:
                  'De fyra rullgardinerna sätter Status, Allvar, Kategori och Språk (ärendets originalspråk - ändra det om den automatiska igenkänningen blev fel). Det sparas direkt.',
              },
              {
                navn: 'Markera som löst',
                tekst:
                  'Tryck _✅ Markera som löst_ och välj antingen _Löst i OTA_ (Zeekr har åtgärdat det i en uppdatering) eller _💬 Klarlagt_ (avslutat utan OTA-fix, t.ex. ett missförstått ärende).',
              },
              {
                navn: 'Redigera',
                tekst: 'Under ⋯-menyn: ändra rubrik och beskrivning (t.ex. strama upp ett ärende före rapporten).',
              },
              {
                navn: 'Ta bort',
                tekst:
                  'Under ⋯-menyn, med en bekräftelse. Borttagningen går inte att ångra och tar även bort ärendets bilder.',
              },
              {
                navn: 'Slå ihop',
                tekst:
                  'Under ⋯-menyn på DUBBLETTEN: sök fram originalet (även på dansk/engelsk rubrik) och bekräfta. Röster flyttas med en per bil, kommentarer och bilder flyttas, och dubbletten döljs överallt. Den står under _Ihopslagna dubbletter_ längst ned, där _↩ Ångra_ lägger tillbaka allt. Ett importerat bugherrer-ärende kan inte vara dubbletten före cutover.',
              },
            ],
          },
          { note: 'Fliken visar också "Senaste feedback-aktivitet" (nya ärenden och bekräftelser).' },
        ],
      },
      {
        ikon: '💬',
        titel: 'Forum - rapportkön',
        blokke: [
          {
            p: 'Högst upp på fliken Forum: innehåll som användare (eller senare AI) har flaggat. Varje kort visar om det är en tråd eller ett inlägg, anledningen, vem som rapporterade, författaren och ett utdrag.',
          },
          { afsnit: 'Tre val per rapport' },
          {
            liste: [
              {
                navn: '🗑 Ta bort tråd/inlägg',
                tekst:
                  'Välj en anledning (förvald till rapportens egen) + ev. förtydligande, och tryck _Ta bort + meddela_. Tar bort innehållet, meddelar författaren och markerar rapporten som hanterad i ett svep.',
              },
              {
                navn: '🛡 Varna författaren',
                tekst:
                  'Anledning + förtydligande + _Skicka varning_. Skickar ett officiellt meddelande utan att ta bort innehållet.',
              },
              { navn: 'Avvisa rapport', tekst: 'Stänger rapporten utan åtgärd - t.ex. om den är ogrundad.' },
            ],
          },
          {
            note: 'En åtgärd hämtar kön på nytt, så den hanterade punkten försvinner. "Visa fler" hämtar nästa sida.',
          },
        ],
      },
      {
        ikon: '💬',
        titel: 'Forum - moderering av trådar och inlägg',
        blokke: [
          {
            p: 'Två kolumner - Trådar och Inlägg. Sök i rubrik eller författare, eller slå på _⚑ Kräver uppmärksamhet_ (trådar/inlägg med en öppen rapport eller skrivna av en användare som är spärrad just nu). "Visa fler" hämtar nästa 25. Åtgärderna slår igenom i forumet direkt.',
          },
          { afsnit: 'Trådar' },
          {
            liste: [
              {
                navn: '📌 Fäst / Lossa',
                tekst: 'Lägger tråden överst i sin kategori. 📌 vid rubriken = redan fäst.',
              },
              { navn: '🔒 Lås / Lås upp', tekst: 'Låser för nya svar. 🔒 vid rubriken = redan låst.' },
              { navn: '🗑 Ta bort tråd', tekst: 'Med anledning + meddelande till författaren.' },
            ],
          },
          { afsnit: 'Inlägg' },
          {
            liste: [
              {
                navn: '🗑 Ta bort',
                tekst:
                  'Med anledning + meddelande. Startinlägget kan inte tas bort för sig - använd "Ta bort tråd" i trådkolumnen.',
              },
            ],
          },
          {
            note: 'Fliken Forum har också "Senaste forumaktivitet" (nya trådar och svar) - en ren översikt, inga åtgärder.',
          },
        ],
      },
      {
        ikon: '🗂️',
        titel: 'Forum - kategorier',
        blokke: [
          {
            p: 'Skapa, byt namn, flytta mellan grupper, sortera och lås kategorier - direkt här, utan att gå in i databasen. (Redigeraren är på danska.)',
          },
          {
            liste: [
              { navn: 'Ny kategori', tekst: '"+ Ny kategori" under en grupp lägger den i just den gruppen.' },
              { navn: 'Ny grupp', tekst: '"+ Ny gruppe" längst ner skapar en helt ny grupp.' },
              {
                navn: 'Sortera + flytta',
                tekst:
                  'Pilarna sorterar om kategorin i gruppen; rullgardinen flyttar den till en annan grupp; pilarna vid gruppens rubrik sorterar om själva grupperna.',
              },
              {
                navn: 'Lås',
                tekst: 'I en låst kategori kan bara moderatorer starta trådar (t.ex. en anslagstavla).',
              },
              { navn: 'Ta bort', tekst: 'Bara möjligt när kategorin är tom - flytta eller ta bort trådarna först.' },
              {
                navn: 'Modellforum',
                tekst:
                  'Forum under Modellerne är fast kopplade till en bilmodell. De kan inte flyttas, och Modellerne kan inte få vanliga kategorier.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📜',
        titel: 'Forum - regler',
        blokke: [
          {
            p: 'Forumets gemensamma spelregler. Redigera texten och spara - då slår den igenom på `/forum/regler` direkt. (Redigeraren och reglerna är på danska.)',
          },
        ],
      },
      {
        ikon: '🚩',
        titel: 'Anmälningar - privata meddelanden',
        blokke: [
          {
            p: 'Meddelanden som någon har anmält - du ser bara det anmälda, inte övriga konversationer. Varje kort visar anmälaren, motiveringen och själva meddelandet.',
          },
          {
            liste: [
              { navn: 'Öppna konversationen', tekst: 'Hoppar till konversationen om du behöver sammanhanget.' },
              {
                navn: '✓ Markera som hanterad',
                tekst: 'Stänger anmälan (kan sättas tillbaka till "ny" igen).',
              },
              {
                navn: '🗑 Ta bort meddelande',
                tekst:
                  'Tar bort det anmälda meddelandet, med en bekräftelse. Anmälan finns kvar som historik.',
              },
              { navn: 'Visa alla / bara nya', tekst: 'Växlar mellan alla anmälningar och bara de ohanterade.' },
            ],
          },
        ],
      },
      {
        ikon: '📨',
        titel: 'Kontakt - privata förfrågningar',
        blokke: [
          {
            p: 'Meddelanden som inloggade ägare har skickat till personalen via kontaktsidan - t.ex. ett klagomål på en annan användare, säkerhet/personuppgifter eller något personligt. Bara personalen ser dem. Varje kort visar avsändare, ämne, meddelande och ev. en svarsadress.',
          },
          {
            liste: [
              {
                navn: '✓ Markera som hanterad',
                tekst:
                  'Hanterade förfrågningar ligger kvar nedtonade (kan sättas tillbaka till ohanterad). Ohanterade ligger överst.',
              },
              {
                navn: 'Svara',
                tekst: 'Klicka på e-postadressen om personen har angett en. Svara annars via ett privat meddelande.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📮',
        titel: 'Rapport till Zeekr',
        blokke: [
          {
            p: 'Här samlas ägarnas ärenden i den rapport som är hela poängen med sajten. Överst ser du "Sedan senaste rapport" (hur mycket nytt som har kommit) och längst ner en logg över vem som har laddat ner rapporter. (Fliken är på danska; själva rapporten kan skapas på danska, engelska eller svenska.)',
          },
          { afsnit: 'Förhandsvisning' },
          {
            liste: [
              {
                navn: 'Välj urval',
                tekst:
                  'Antal (topp 20/50/100/alla), innehåll (fel, önskemål eller båda) och språk (danska, engelska, svenska).',
              },
              {
                navn: 'På/av',
                tekst:
                  '_Inkludér kommentarer_ (utan den markerade lösningen - Zeekr ska få felet, inte lösningen runt det) och _Kun nye + eskalerende_.',
              },
              {
                navn: 'Forhåndsvis PDF / CSV',
                tekst: 'Hämtar rapporten utan att ändra något. Den får du använda fritt.',
              },
              {
                navn: '🔍 Test oversættelse',
                tekst:
                  'Kontrollerar att översättningen till engelska/svenska fungerar (LibreTranslate). Är den inte konfigurerad finns rapporterna bara på danska.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📈',
        titel: 'Aktivitet',
        blokke: [
          {
            p: 'Tillväxt och engagemang: unika aktiva användare per dag (röstade, rapporterade, skrev i forumet eller skickade ett meddelande) och nya användare per dag, de senaste 30 dagarna. En notis om deploy-tidpunkt pekar på de lugnaste timmarna. Ren översikt - inga åtgärder.',
          },
        ],
      },
      {
        ikon: '👥',
        titel: 'Behörigheter - användare och sanktioner',
        blokke: [
          {
            p: 'Översikt över alla registrerade användare. Sök på namn eller e-post, filtrera på roll och status (aktiv, avstängd, bannlyst) och sortera. Varje åtgärd ger användaren ett officiellt meddelande med anledningen och hamnar i loggen. Du kan inte sanktionera ditt eget konto, en admin eller superadmin.',
          },
          { afsnit: 'Åtgärder per användare' },
          {
            liste: [
              { navn: '🛡 Varna', tekst: 'En officiell varning med anledning, utan att spärra något.' },
              {
                navn: '⏸ Stäng av',
                tekst:
                  'Tillfällig skrivspärr - välj längd (1 till 90 dagar) + anledning. Användaren kan fortfarande läsa.',
              },
            ],
          },
        ],
      },
    ],
  },
};
