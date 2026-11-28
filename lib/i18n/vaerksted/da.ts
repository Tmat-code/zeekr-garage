// UI-i18n U6: Værkstedets MODERATOR-del. DANSK = kilden; sv.ts og en.ts er
// typet ud fra denne (`VOrdbog`), så `npx tsc --noEmit` fejler, hvis en nøgle
// mangler eller er i overskud.
//
// Eget namespace, adskilt fra den offentlige ordbog (lib/i18n/da.ts): det
// importeres KUN fra app/admin/** og components/admin/** (håndhævet af
// scripts/i18n-test.mjs), så Værkstedets tekst aldrig ryger med i det
// offentlige bundle. Admin-kun-flader (Links, OTA, admin-delen af Adgange,
// Audit, Rapport, kategori-/model-editor, regler-editor, forside-besked,
// oprydning, admin-manual) forbliver dansk og står ikke her (design valg 2).
//
// Manual-tekst: let markup, som ManualVisning renderer - **fed**, _kursiv_,
// `kode`.

import type { VFejl } from '@/lib/vaerksted-fejl';

export type ManualBlok =
  | { p: string }
  | { note: string }
  | { afsnit: string }
  | { liste: { navn?: string; tekst: string }[] }
  | { situationer: { naar: string; tekst: string }[] };

export type ManualKort = { ikon: string; titel: string; blokke: ManualBlok[] };

export const vda = {
  navn: 'Værkstedet',
  metaTitel: (side: string) => `${side} - Værkstedet`,

  ramme: {
    loggetIndSom: 'Logget ind som',
    tilForsiden: '← Til forsiden',
    logUd: 'Log ud',
    tilbage: '← Tilbage til Overblik',
  },

  roller: {
    superadmin: 'superadmin',
    admin: 'admin',
    moderator: 'moderator',
  },

  nav: {
    overblik: 'Overblik',
    feedback: 'Feedback',
    rapport: 'Rapport',
    forum: 'Forum',
    links: 'Links',
    ota: 'OTA',
    anmeldelser: 'Anmeldelser',
    kontakt: 'Kontakt',
    aktivitet: 'Aktivitet',
    adgange: 'Adgange',
    audit: 'Audit',
    manual: 'Manual',
    aabneRapporter: (n: number) => `${n} åbne forum-rapporter`,
  },

  genveje: {
    titel: 'Genveje',
    feedback: 'Moderér meldinger + oprydning',
    forum: 'Tråde, kategorier og regler',
    anmeldelser: 'Anmeldte private beskeder',
    kontakt: 'Private henvendelser til staben',
    rapport: 'Saml Zeekr-rapport (PDF/CSV)',
    aktivitet: 'Mønstre over tid',
    adgange: 'Brugere og roller',
    links: 'Nyttige links på /links',
  },

  overblik: {
    titel: 'Overblik',
    aabn: (omraade: string) => `Åbn ${omraade}`,
    meldinger: 'Meldinger i alt',
    bekraeftelser: 'Bekræftelser i alt',
    aabne: 'Åbne (ny + bekræftet)',
    loestIOta: 'Løst i OTA',
    kategorier: 'Kategorier',
    traade: 'Tråde',
    indlaeg: 'Indlæg',
  },

  // Fælles tællere/knapper på tværs af fladerne.
  faelles: {
    iAlt: (n: number) => `${n} i alt`,
    viser: (vist: number, total: number) => `Viser ${vist} af ${total}`,
    visFlere: 'Vis flere',
    ny: 'Ny',
    ejer: 'Ejer',
    enEjer: 'En ejer',
    fortryd: 'Annullér',
    bekraeftSlet: 'Bekræft slet',
    soeg: 'Søg',
    alle: 'Alle',
  },

  feedback: {
    alleMeldinger: 'Alle meldinger',
    senesteAktivitet: 'Seneste feedback-aktivitet',
    aktivitetIntro: 'Nye meldinger og bekræftelser.',
    ingenAktivitet: 'Ingen feedback-aktivitet endnu.',
    ingenMeldinger: 'Ingen meldinger endnu.',
    flereHandlinger: 'Flere handlinger',
    titelPh: 'Titel',
    beskrivelsePh: 'Beskrivelse',
    gem: 'Gem',
    annuller: 'Annullér',
    seKommentarer: 'Se kommentarer',
    svar: (n: number) => `${n} svar`,
    status: 'Status',
    alvor: 'Alvor',
    kategori: 'Kategori',
    sprog: 'Sprog',
    sprogTitle: 'Meldingens originalsprog - styrer rapport- og titel-oversættelsen',
    ingenKategori: '- ingen -',
    sletSpoerg: 'Slet denne melding?',
    loestHvordan: 'Løst hvordan?',
    loestIOta: '✅ Løst i OTA',
    loestIOtaTitle: 'Zeekr har rettet det i en software-opdatering',
    afklaret: '💬 Afklaret',
    afklaretTitle: 'Afsluttet uden OTA-fix, fx fejlinformeret bruger eller afklaret i en kommentar',
    markerLoest: '✅ Markér løst',
    rediger: '✏️ Redigér',
    slet: '🗑 Slet',
    // P43: sammenlæg dubletter
    laegSammen: '🔗 Læg sammen med...',
    samlTitel: 'Læg denne melding ind under originalen',
    samlIntro:
      'Vælg den melding, der skal beholdes. Stemmer (én pr. bil), kommentarer og billeder flyttes dertil, originalen arver modellerne, og denne melding skjules. Kan fortrydes.',
    samlSoegPh: 'Søg efter originalen (titel, også på de andre sprog)',
    samlIngenTraef: 'Ingen meldinger matcher.',
    samlVaelg: 'Vælg',
    samlBekraeft: (dublet: string, original: string) => `Læg "${dublet}" ind under "${original}"?`,
    samlKnap: '🔗 Læg sammen',
    samlImporteret:
      'Importeret fra bugherrer - kan ikke være dubletten før cutover. Læg i stedet den anden melding ind under denne.',
    stemmer: (n: number) => `${n} ${n === 1 ? 'stemme' : 'stemmer'}`,
    sammenlagtTitel: 'Sammenlagte dubletter',
    sammenlagtIntro:
      'Dubletter der er lagt ind under en original. De er skjult overalt (board, søgning, rapport). Fortryd flytter stemmer, kommentarer og billeder tilbage.',
    ingenSammenlagte: 'Ingen sammenlagte dubletter.',
    dublet: 'Dublet',
    original: 'Original',
    flyttet: (s: number, d: number, k: number, b: number) =>
      `${s} ${s === 1 ? 'stemme' : 'stemmer'} flyttet` +
      (d > 0 ? ` (${d} fra samme bil fjernet)` : '') +
      ` · ${k} ${k === 1 ? 'kommentar' : 'kommentarer'} · ${b} ${b === 1 ? 'billede' : 'billeder'}`,
    af: (navn: string | null, dato: string) => `${navn ?? 'Ukendt'} · ${dato}`,
    fortrydKnap: '↩ Fortryd',
    fortrydSpoerg: 'Fortryd sammenlægningen?',
  },

  aktivitetFeed: {
    nyMelding: 'Ny melding:',
    bekraeftelsePaa: 'Bekræftelse på',
    nyTraad: 'Ny tråd:',
    nytSvarI: 'Nyt svar i',
    enMelding: 'en melding',
    enTraad: 'en tråd',
    ingen: 'Ingen aktivitet endnu.',
  },

  forumSide: {
    rapporterTitel: 'Indgående rapporter',
    ingenAabne: 'ingen åbne',
    aabne: (n: number) => `${n} åbne`,
    rapporterIntro:
      'Indhold som brugere (eller senere AI) har markeret. Fjern tråden/indlægget med en grund (forfatteren får en officiel besked), advar forfatteren, eller afvis rapporten. En handling herfra markerer rapporten håndteret.',
    modTitel: 'Forum-moderering',
    modTaeller: (traade: number, indlaeg: number) => `${traade} tråde · ${indlaeg} indlæg`,
    modIntro:
      'Fastgør, lås eller fjern tråde og indlæg. Handlingerne slår igennem på forummet med det samme. Søg eller filtrér til det der kræver opmærksomhed, og hent flere med "Vis flere".',
    aktivitetTitel: 'Seneste forum-aktivitet',
    aktivitetIntro: 'Nye tråde og svar på forummet.',
    ingenAktivitet: 'Ingen forum-aktivitet endnu.',
  },

  forumMod: {
    harRapportTitle: 'Har en åben rapport',
    rapportMaerke: '⚑ rapport',
    spaerretTitle: 'Forfatteren er spærret lige nu',
    spaerretMaerke: '🚫 spærret',
    fastgjort: 'Fastgjort',
    laast: 'Låst',
    svar: (n: number) => `${n} svar`,
    visninger: (n: number) => (n === 1 ? '1 visning' : `${n} visninger`),
    fjernFastgoer: 'Fjern fastgør.',
    fastgoer: '📌 Fastgør',
    laasOp: 'Lås op',
    laas: '🔒 Lås',
    fjernTraad: '🗑 Fjern tråd',
    fjernTraadSubmit: 'Fjern tråd + giv besked',
    iTraad: 'i',
    aabning: '(åbning)',
    aabningsIndlaeg: 'Åbnings-indlæg - brug "Fjern tråd"',
    fjern: '🗑 Fjern',
    fjernIndlaegSubmit: 'Fjern indlæg + giv besked',
    soegLabel: 'Søg i titel eller forfatter',
    soegPh: 'fx dæktryk eller et navn',
    vis: 'Vis',
    kraeverOpm: '⚑ Kræver opmærksomhed',
    opmForklaring:
      '"Kræver opmærksomhed" = tråde/indlæg der enten har en åben rapport, eller er skrevet af en bruger der lige nu er spærret.',
    traadeOverskrift: (vist: number, total: number) => `Tråde (viser ${vist} af ${total})`,
    indlaegOverskrift: (vist: number, total: number) => `Indlæg (viser ${vist} af ${total})`,
    ingenTraadeMatcher: 'Ingen tråde matcher.',
    ingenTraade: 'Ingen tråde endnu.',
    ingenIndlaegMatcher: 'Ingen indlæg matcher.',
    ingenIndlaeg: 'Ingen indlæg endnu.',
    visFlereTraade: 'Vis flere tråde',
    visFlereIndlaeg: 'Vis flere indlæg',
    kunneIkkeHenteTraade: 'Kunne ikke hente tråde.',
    kunneIkkeHenteIndlaeg: 'Kunne ikke hente indlæg.',
  },

  rapporter: {
    indlaeg: 'Indlæg',
    traad: 'Tråd',
    grund: (grund: string) => `Grund: ${grund}`,
    aiFlag: 'AI-flag',
    rapporteretAf: (navn: string) => `· rapporteret af ${navn}`,
    alleredeFjernet: 'allerede fjernet',
    forfatter: (navn: string) => `· forfatter: ${navn}`,
    fjernIndlaeg: '🗑 Fjern indlæg',
    fjernTraad: '🗑 Fjern tråd',
    advarForfatter: '🛡 Advar forfatter',
    afvis: 'Afvis rapport',
    fjernIndlaegSubmit: 'Fjern indlæg + giv besked',
    fjernTraadSubmit: 'Fjern tråd + giv besked',
    sendAdvarsel: 'Send advarsel',
    ingenAabne: 'Ingen åbne rapporter. 🎉',
    visFlere: 'Vis flere rapporter',
    kunneIkkeHente: 'Kunne ikke hente rapporter.',
  },

  anmeldelser: {
    titel: 'Anmeldelser',
    intro:
      'Anmeldte private beskeder. Du ser kun det, nogen har anmeldt - ikke øvrige samtaler. Markér som håndteret, eller slet en besked der overtræder reglerne.',
    haandteret: 'Håndteret',
    anmeldtAf: (navn: string, tid: string) => `Anmeldt af ${navn} · ${tid}`,
    begrundelse: 'Begrundelse:',
    ingenBegrundelse: 'Ingen begrundelse angivet.',
    skrev: (navn: string) => `${navn} skrev`,
    beskedSlettet: 'Beskeden er slettet. Anmeldelsen står som historik.',
    helSamtale: 'Hele samtalen er anmeldt (ingen enkelt besked udpeget).',
    aabnSamtale: 'Åbn samtale',
    markerNy: 'Markér som ny',
    markerHaandteret: '✓ Markér håndteret',
    sletBesked: '🗑 Slet besked',
    nye: (n: number) => `${n} nye`,
    haandterede: (n: number) => `${n} håndterede`,
    visKunNye: 'Vis kun nye',
    visAlle: 'Vis alle',
    ingenEndnu: 'Ingen anmeldelser endnu.',
    ingenNye: 'Ingen nye anmeldelser. Alt er håndteret. 👍',
  },

  kontakt: {
    henvendelser: 'Henvendelser',
    ingenEndnuTaeller: 'ingen endnu',
    intro:
      'Private beskeder fra ejere via Kontakt-siden - klage over en bruger, sikkerhed/persondata eller noget personligt. Ses kun af staben.',
    behandlet: 'Behandlet',
    markerUbehandlet: '↩ Markér ubehandlet',
    markerBehandlet: '✓ Markér behandlet',
    visFlere: 'Vis flere henvendelser',
    ingen: 'Ingen henvendelser endnu. 🎉',
    kunneIkkeHente: 'Kunne ikke hente henvendelser.',
  },

  aktivitet: {
    titel: 'Aktivitet',
    intro:
      'Vækst og engagement - unikke aktive brugere og nye brugere pr. dag, sidste 30 dage (dansk tid).',
    aktive30: 'Aktive (30 dage)',
    nye30: 'Nye brugere (30 dage)',
    brugereIAlt: 'Brugere i alt',
    aktivePrDag: 'Aktive brugere pr. dag',
    aktiveForklaring:
      'Unikke brugere der gjorde noget den dag: stemte, meldte, skrev i forummet (tråd eller svar) eller sendte en besked.',
    ingenData: 'Ingen registreret aktivitet i perioden endnu.',
    nyePrDag: 'Nye brugere pr. dag',
    nyeForklaring: 'Tilmeldinger (oprettede profiler).',
    iDag: 'i dag',
    deploy: (roligst: string, travlest: string | null) =>
      `🔧 Deploy-timing: roligst omkring kl. ${roligst}${
        travlest ? ` (travlest kl. ${travlest})` : ''
      } - de stille timer er tryggest at deploye (kort nedetid rammer færrest).`,
    serverNote:
      '💡 Dette er fællesskabs-aktivitet (brugere der bruger sitet) - ikke serverens CPU/hukommelse. Den egentlige server-belastning kan du se i Coolifys egen overvågning på applikationen.',
  },

  brugere: {
    adgangeTitel: 'Adgange',
    titel: 'Brugere',
    intro: (erAdmin: boolean) =>
      `Overblik over alle oprettede brugere. Søg og filtrér, og handl på en bruger: advar eller suspendér${
        erAdmin ? ', ban, ophæv eller anonymisér' : ''
      }. Hver handling giver brugeren en officiel besked med grunden og lander i moderations-loggen.`,
    dage: (n: number) => (n === 1 ? '1 dag' : `${n} dage`),
    aktiv: 'Aktiv',
    suspenderetTil: (dato: string) => `Suspenderet til ${dato}`,
    suspenderet: 'Suspenderet',
    anonymiseret: 'Anonymiseret',
    bannet: 'Bannet',
    ingenRolle: 'ingen rolle',
    anonymiseretNavn: '(anonymiseret)',
    dig: '(dig)',
    oprettet: (tid: string) => `oprettet ${tid}`,
    sidstLogget: (tid: string) => `sidst logget ind ${tid}`,
    aldrigLogget: 'aldrig logget ind',
    advar: '🛡 Advar',
    suspender: '⏸ Suspendér',
    ban: '⛔ Ban',
    ophaev: '✅ Ophæv spærring',
    anonymiser: '👤 Anonymisér',
    egenKonto: 'Du kan ikke sanktionere din egen konto.',
    maalErAdmin: 'En admin kan ikke sanktioneres - fjern admin-rollen først.',
    kontoAnonymiseret: 'Kontoen er anonymiseret.',
    sendAdvarsel: 'Send advarsel',
    varighed: 'Varighed:',
    suspenderSubmit: 'Suspendér + giv besked',
    banForklaring:
      'Permanent skrive-spærre. Brugeren kan stadig læse, men ikke bidrage. Kan ophæves igen.',
    banSubmit: 'Ban + giv besked',
    anonymForklaring: 'Rydder persondata (navn, e-mail, VIN/noter) og spærrer permanent.',
    anonymForklaring2:
      'Biler, bekræftelser og forum-indlæg bevares (de er QA-signalet) - men bliver forfatterløse i visningen. Handlingen kan ikke fortrydes.',
    anonymSubmit: 'Anonymisér personen',
    navnEllerEmail: 'Navn eller email',
    soegPh: 'fx Mette eller mette@...',
    rolle: 'Rolle',
    udenRolle: 'Uden rolle',
    rolleModerator: 'Moderator',
    rolleAdmin: 'Admin',
    status: 'Status',
    sorter: 'Sortér',
    nyeste: 'Nyeste',
    sidstAktive: 'Sidst aktive',
    navn: 'Navn',
    ingenMatcher: 'Ingen brugere matcher.',
    kunneIkkeHente: 'Kunne ikke hente brugere.',
  },

  fejl: {
    ingenAdgang: 'Du har ikke adgang til at gøre det.',
    ugyldigStatus: 'Ugyldig status.',
    ugyldigAlvor: 'Ugyldig alvor.',
    ugyldigKategori: 'Ugyldig kategori.',
    ugyldigtSprog: 'Ugyldigt sprog.',
    tomTitel: 'Titlen må ikke være tom.',
    ugyldigGrund: 'Ugyldig grund.',
    ugyldigeDage: 'Antal dage skal være mellem 1 og 3650.',
    egenKonto: 'Du kan ikke sanktionere din egen konto.',
    maalErAdmin: 'En admin eller superadmin kan ikke sanktioneres - fjern rollen først.',
    brugerFindesIkke: 'Brugeren findes ikke.',
    henvendelseFindesIkke: 'Henvendelsen findes ikke længere.',
    meldingFindesIkke: 'Meldingen findes ikke længere.',
    samlSelv: 'En melding kan ikke lægges sammen med sig selv.',
    samlImporteret: 'En importeret bugherrer-melding kan ikke være dubletten før cutover.',
    samlAllerede: 'Meldingen er allerede lagt sammen.',
    samlOriginalSkjult: 'Originalen er selv lagt sammen med en anden melding - vælg den i stedet.',
    samlHarIndlagte: 'Denne melding har selv fået dubletter lagt ind - fortryd dem først, eller brug den som original.',
    samlTypeForskel: 'En fejl og et ønske kan ikke lægges sammen.',
    sammenlaegningFindesIkke: 'Sammenlægningen findes ikke længere.',
    alleredeFortrudt: 'Sammenlægningen er allerede fortrudt.',
    fortrydManuelt: 'Dubletten peger ikke længere på originalen - fortryd manuelt.',
    nogetGikGalt: 'Noget gik galt. Prøv igen.',
  } satisfies Record<VFejl, string>,

  // --- Manual-rammen + MODERATOR-manualen. Admin-manualen (Links, OTA,
  // Modeller, Audit, oprydning m.m.) bor i components/admin/AdminManual.tsx
  // og forbliver dansk. ---
  manual: {
    titel: 'Manual',
    intro: 'Opslagsværk til hvordan Værkstedet virker - flade for flade.',
    adminManual: 'Admin-manual',
    modManual: 'Moderator-manual',
    serAdmin: 'Du ser admin-manualen - alt i Værkstedet.',
    serMod: 'Du ser moderator-manualen - præcis det, en moderator ser. God til onboarding.',
    kort: [
      {
        ikon: '🚗',
        titel: 'Hvad er Zeekr Garage',
        blokke: [
          {
            p: 'Zeekr Garage er et uafhængigt, uofficielt community for Zeekr-ejere i Norden. Sitet har to halvdele: **feedback-boardet**, hvor ejere melder fejl og ønsker ind, og andre trykker "mig med" for at lægge en stemme på (en _melding_), og **forummet**, hvor man snakker (tråde og svar).',
          },
          {
            p: 'Pointen med det hele: de bedste, mest bekræftede meldinger samles i en **rapport til Zeekr** - professionel, struktureret ejer-feedback. Jo renere og mere civilt board og forum, jo stærkere står den rapport. Det er dét, moderering tjener - ikke at patruljere, men at holde signalet skarpt.',
          },
          { p: '**Værkstedet** (her) er bagscenen, hvor det arbejde foregår.' },
          {
            liste: [
              {
                navn: 'Hvor forum-rapporterne kommer fra',
                tekst:
                  'Brugerne trykker ⚑ ude på selve forummet; det markerede indhold lander i rapport-køen øverst på Forum-fanen. (Forveksl ikke de to slags "rapport": en _forum-rapport_ er en anmeldelse fra en bruger - _rapporten til Zeekr_ er den samlede feedback, der sendes videre.)',
              },
            ],
          },
        ],
      },
      {
        ikon: '🧭',
        titel: 'Sådan hænger Værkstedet sammen',
        blokke: [
          {
            p: 'Værkstedet er bagscenen til Zeekr Garage - her holder vi forummet og feedback-meldingerne civile og brugbare, så den feedback, ejerne giver, bliver til en stærk rapport til Zeekr.',
          },
          {
            p: 'Som moderator håndterer du det daglige: forum-rapporter, tråde og indlæg, anmeldte beskeder, private henvendelser, feedback-meldinger og advarsler/suspensioner. Denne manual dækker det hele.',
          },
          {
            liste: [
              {
                navn: 'Navigation',
                tekst:
                  'Fane-rækken øverst følger fladerne: Overblik, Feedback, Rapport, Forum, Anmeldelser, Kontakt, Aktivitet, Adgange og Manual. Forum-fanen får et lille kobber-tal, når der er åbne rapporter.',
              },
              {
                navn: 'Grundregel',
                tekst:
                  'Hver handling, der rammer en bruger - fjern med grund, advarsel, suspension - sender personen en officiel besked med grunden og lander i moderations-loggen. Ingen stumme fjernelser.',
              },
              {
                navn: 'Grunde',
                tekst:
                  'De faste grunde er Dublet, Tone / personangreb, Off-topic, Spam og Andet. Du kan altid uddybe i fritekst-feltet.',
              },
              {
                navn: 'Sprog',
                tekst:
                  'Værkstedet følger dit sprog (vælges i sidefoden eller i Min garage). Brugernes indhold - meldinger, indlæg, beskeder, henvendelser - står på det sprog, det er skrevet på. Kategori- og regel-editoren på Forum-fanen og Rapport-fanen er kun på dansk.',
              },
            ],
          },
        ],
      },
      {
        ikon: '🧰',
        titel: 'Typiske situationer - sådan gør du',
        blokke: [
          {
            p: 'Fra "det sker" til "hvor + hvad". Mangler du detaljerne, står de under den enkelte flade længere nede.',
          },
          {
            situationer: [
              {
                naar: 'Et indlæg eller en tråd er grimt eller et personangreb',
                tekst:
                  'Er det allerede anmeldt: Forum-fanen → rapport-køen øverst → 🗑 Fjern med grund (eller 🛡 Advar forfatteren). Ellers: Forum-moderering → søg tråden/indlægget frem → 🗑 Fjern med grund. Forfatteren får automatisk en besked.',
              },
              {
                naar: 'En bruger spammer eller bliver ved',
                tekst:
                  'Adgange → find brugeren → 🛡 Advar først; fortsætter det, ⏸ Suspendér (vælg antal dage).',
              },
              {
                naar: 'To tråde om samme fejl (dublet)',
                tekst:
                  'Forum-moderering → Fjern den ene med grund = Dublet, og skriv linket til originalen i uddyb-feltet.',
              },
              {
                naar: 'En privat besked er anmeldt',
                tekst:
                  'Anmeldelser-fanen → læs den → ✓ Markér håndteret, eller 🗑 Slet besked hvis den bryder reglerne.',
              },
              {
                naar: 'En ejer har skrevet til staben via Kontakt',
                tekst:
                  'Kontakt-fanen → læs henvendelsen, svar evt. via mail-linket (hvis personen har angivet en mail) → ✓ Markér behandlet.',
              },
              {
                naar: 'En melding er klassificeret forkert eller skal strammes op',
                tekst:
                  'Feedback-fanen → ret Status/Alvor/Kategori/Sprog på rækken, eller ✏️ Redigér titel og beskrivelse under ⋯-menuen.',
              },
              {
                naar: 'Zeekr har rettet en fejl i en opdatering',
                tekst: 'Feedback-fanen → find meldingen → ✅ Markér løst → Løst i OTA.',
              },
              {
                naar: 'Samme fejl er meldt to gange (fx på dansk og svensk)',
                tekst:
                  'Feedback-fanen → ⋯ på den nyeste/mindste → 🔗 Læg sammen med... → vælg originalen. Så samles stemmerne på én melding over for Zeekr.',
              },
            ],
          },
        ],
      },
      {
        ikon: '📊',
        titel: 'Overblik (forsiden)',
        blokke: [
          {
            p: 'Landingssiden i Værkstedet. Tal-tiles for Feedback (meldinger, bekræftelser, åbne, løst i OTA) og Forum (kategorier, tråde, indlæg), plus et genvejs-gitter til alle fladerne. Rent overblik - du handler ikke her.',
          },
        ],
      },
      {
        ikon: '🗒️',
        titel: 'Feedback - meldinger',
        blokke: [
          {
            p: 'Alle ejernes meldinger, sorteret med flest stemmer øverst. Hver række viser stemmetal, titel, type (fejl eller ønske), model og evt. software-version, og et link til kommentarerne, hvis der er nogen.',
          },
          { afsnit: 'Sådan gør du' },
          {
            liste: [
              {
                navn: 'Klassificér',
                tekst:
                  'De fire dropdowns sætter Status, Alvor, Kategori og Sprog (meldingens originalsprog - ret det, hvis den automatiske genkendelse ramte forkert). Det gemmer med det samme.',
              },
              {
                navn: 'Markér løst',
                tekst:
                  'Tryk _✅ Markér løst_ og vælg enten _Løst i OTA_ (Zeekr har rettet det i en opdatering) eller _💬 Afklaret_ (afsluttet uden et OTA-fix, fx en misforstået melding).',
              },
              {
                navn: 'Redigér',
                tekst: 'Under ⋯-menuen: ret titel og beskrivelse (fx stramme en melding op før rapporten).',
              },
              {
                navn: 'Slet',
                tekst:
                  'Under ⋯-menuen, med en bekræftelse. Sletningen er uoprettelig og fjerner også meldingens billeder.',
              },
              {
                navn: 'Læg sammen',
                tekst:
                  'Under ⋯-menuen på DUBLETTEN: søg originalen frem (også på svensk/engelsk titel) og bekræft. Stemmer flyttes med én pr. bil, kommentarer og billeder flyttes, og dubletten skjules overalt. Står under _Sammenlagte dubletter_ nederst, hvor _↩ Fortryd_ lægger alt tilbage. En importeret bugherrer-melding kan ikke være dubletten før cutover.',
              },
            ],
          },
          { note: 'Fanen viser også "Seneste feedback-aktivitet" (nye meldinger og bekræftelser).' },
        ],
      },
      {
        ikon: '💬',
        titel: 'Forum - rapport-køen',
        blokke: [
          {
            p: 'Øverst på Forum-fanen: indhold som brugere (eller senere AI) har markeret. Hvert kort viser om det er en tråd eller et indlæg, grunden, hvem der rapporterede, forfatteren og et uddrag.',
          },
          { afsnit: 'Tre valg pr. rapport' },
          {
            liste: [
              {
                navn: '🗑 Fjern tråd/indlæg',
                tekst:
                  'Vælg en grund (forvalgt til rapportens egen) + evt. uddyb, og tryk _Fjern + giv besked_. Fjerner indholdet, giver forfatteren besked og markerer rapporten håndteret i ét hug.',
              },
              {
                navn: '🛡 Advar forfatter',
                tekst: 'Grund + uddyb + _Send advarsel_. Sender en officiel besked uden at fjerne indholdet.',
              },
              { navn: 'Afvis rapport', tekst: 'Lukker rapporten uden handling - fx hvis den er grundløs.' },
            ],
          },
          {
            note: 'En handling henter køen forfra, så det håndterede punkt falder ud. "Vis flere" henter næste side.',
          },
        ],
      },
      {
        ikon: '💬',
        titel: 'Forum - moderering af tråde og indlæg',
        blokke: [
          {
            p: 'To kolonner - Tråde og Indlæg. Søg i titel eller forfatter, eller slå _⚑ Kræver opmærksomhed_ til (tråde/indlæg med en åben rapport, eller skrevet af en bruger der er spærret lige nu). "Vis flere" henter næste 25. Handlingerne slår igennem på forummet med det samme.',
          },
          { afsnit: 'Tråde' },
          {
            liste: [
              {
                navn: '📌 Fastgør / Fjern fastgør.',
                tekst: 'Sætter tråden øverst i sin kategori. 📌 ved titlen = allerede fastgjort.',
              },
              { navn: '🔒 Lås / Lås op', tekst: 'Låser for nye svar. 🔒 ved titlen = allerede låst.' },
              { navn: '🗑 Fjern tråd', tekst: 'Med grund + besked til forfatteren.' },
            ],
          },
          { afsnit: 'Indlæg' },
          {
            liste: [
              {
                navn: '🗑 Fjern',
                tekst:
                  'Med grund + besked. Åbnings-indlægget kan ikke fjernes for sig - brug "Fjern tråd" i tråd-kolonnen.',
              },
            ],
          },
          {
            note: 'Forum-fanen har også "Seneste forum-aktivitet" (nye tråde og svar) - et rent overblik, ingen handlinger.',
          },
        ],
      },
      {
        ikon: '🗂️',
        titel: 'Forum - kategorier',
        blokke: [
          {
            p: 'Opret, omdøb, flyt mellem grupper, sortér og lås kategorier - direkte her, uden at gå i databasen. (Editoren er på dansk.)',
          },
          {
            liste: [
              { navn: 'Ny kategori', tekst: '"+ Ny kategori" under en gruppe lægger den i netop den gruppe.' },
              { navn: 'Ny gruppe', tekst: '"+ Ny gruppe" nederst laver en helt ny spand.' },
              {
                navn: 'Sortér + flyt',
                tekst:
                  "Pilene omsorterer kategorien i gruppen; dropdown'en flytter den til en anden gruppe; pilene ved gruppe-overskriften omsorterer selve grupperne.",
              },
              {
                navn: 'Lås',
                tekst: 'En låst kategori kan kun moderatorer starte tråde i (fx en opslagstavle).',
              },
              { navn: 'Slet', tekst: 'Kun muligt når kategorien er tom - flyt eller fjern trådene først.' },
              {
                navn: 'Model-fora',
                tekst:
                  'Fora under Modellerne er fast koblet til en bil-model. De kan ikke flyttes, og Modellerne kan ikke få almindelige kategorier.',
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
            p: 'De fælles spilleregler for forummet. Rediger teksten og gem - så slår den igennem på `/forum/regler` med det samme. (Editoren og reglerne er på dansk.)',
          },
        ],
      },
      {
        ikon: '🚩',
        titel: 'Anmeldelser - private beskeder',
        blokke: [
          {
            p: 'Beskeder som nogen har anmeldt - du ser kun det anmeldte, ikke de øvrige samtaler. Hvert kort viser anmelderen, begrundelsen og selve beskeden.',
          },
          {
            liste: [
              { navn: 'Åbn samtale', tekst: 'Hopper til samtalen, hvis du har brug for konteksten.' },
              { navn: '✓ Markér håndteret', tekst: 'Lukker anmeldelsen (kan sættes tilbage til "ny" igen).' },
              {
                navn: '🗑 Slet besked',
                tekst:
                  'Fjerner den anmeldte besked, med en bekræftelse. Anmeldelsen bliver stående som historik.',
              },
              { navn: 'Vis alle / kun nye', tekst: 'Skifter mellem alle anmeldelser og kun de ubehandlede.' },
            ],
          },
        ],
      },
      {
        ikon: '📨',
        titel: 'Kontakt - private henvendelser',
        blokke: [
          {
            p: 'Beskeder som indloggede ejere har sendt til staben via Kontakt-siden - fx en klage over en anden bruger, sikkerhed/persondata eller noget personligt. Kun staben ser dem. Hvert kort viser afsender, emne, besked og evt. en svar-mail.',
          },
          {
            liste: [
              {
                navn: '✓ Markér behandlet',
                tekst:
                  'Behandlede henvendelser bliver stående nedtonet (kan sættes tilbage til ubehandlet). Ubehandlede står øverst.',
              },
              { navn: 'Svar', tekst: 'Klik på mail-adressen, hvis personen har angivet en. Svar ellers via en privat besked.' },
            ],
          },
        ],
      },
      {
        ikon: '📮',
        titel: 'Rapport til Zeekr',
        blokke: [
          {
            p: 'Her samles ejernes meldinger til den rapport, der er hele pointen med sitet. Øverst ser du "Siden sidste rapport" (hvor meget nyt der er kommet) og nederst en log over, hvem der har downloadet rapporter. (Fanen er på dansk; rapporten selv kan dannes på dansk, engelsk eller svensk.)',
          },
          { afsnit: 'Forhåndsvisning' },
          {
            liste: [
              {
                navn: 'Vælg udsnit',
                tekst:
                  'Antal (top 20/50/100/alle), indhold (fejl, ønsker eller begge), og sprog (dansk, engelsk, svensk).',
              },
              {
                navn: 'Til/fra',
                tekst:
                  "_Inkludér kommentarer_ (uden den markerede løsning - Zeekr skal have fejlen, ikke workaround'en) og _Kun nye + eskalerende_.",
              },
              {
                navn: 'Forhåndsvis PDF / CSV',
                tekst: 'Henter rapporten uden at ændre noget. Den må du gerne bruge frit.',
              },
              {
                navn: '🔍 Test oversættelse',
                tekst:
                  'Tjekker at oversættelsen til engelsk/svensk virker (LibreTranslate). Er den ikke konfigureret, er rapporterne kun på dansk.',
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
            p: 'Vækst og engagement: unikke aktive brugere pr. dag (stemte, meldte, skrev i forummet eller sendte en besked) og nye brugere pr. dag, de sidste 30 dage. En deploy-timing-note peger på de roligste timer. Rent overblik - ingen handlinger.',
          },
        ],
      },
      {
        ikon: '👥',
        titel: 'Adgange - brugere og sanktioner',
        blokke: [
          {
            p: 'Overblik over alle oprettede brugere. Søg på navn eller email, filtrér på rolle og status (aktiv, suspenderet, bannet), og sortér. Hver handling giver brugeren en officiel besked med grunden og lander i loggen. Du kan ikke sanktionere din egen konto, en admin eller superadmin.',
          },
          { afsnit: 'Handlinger pr. bruger' },
          {
            liste: [
              { navn: '🛡 Advar', tekst: 'En officiel advarsel med grund, uden at spærre noget.' },
              {
                navn: '⏸ Suspendér',
                tekst:
                  'Midlertidig skrive-spærre - vælg varighed (1 til 90 dage) + grund. Brugeren kan stadig læse.',
              },
            ],
          },
        ],
      },
    ] as ManualKort[],
  },
};

export type VOrdbog = typeof vda;
