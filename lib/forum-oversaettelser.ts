// U7: sv/en-oversættelser af de NUVÆRENDE forum-grupper, -kategorier og
// forum-reglerne, keyet på den danske tekst. Den SAMME tabel er seedet i
// migrationen 20261128090000_u7_db_indhold_i18n.sql (kun på rækker der endnu
// ikke er oversat) - scripts/i18n-test.mjs tjekker at de to er ens.
//
// Navne og beskrivelser er keyet hver for sig (som links: navn/kilde), så en
// kategori hvis beskrivelse staben har rettet stadig får sit navn oversat.
// Nye kategorier/grupper oversættes af staben i kategori-editoren i Værkstedet;
// denne tabel er kun startpunktet. Rent modul, ingen afhængigheder.

type Par = { sv: string; en: string };

// Gruppe-overskrifter (forum_categories.group_label, denormaliseret pr. række).
export const GRUPPE_LABELS: Readonly<Record<string, Par>> = {
  Velkommen: { sv: 'Välkommen', en: 'Welcome' },
  Modellerne: { sv: 'Modellerna', en: 'The models' },
  'Ejer-lounge': { sv: 'Ägarlounge', en: "Owners' lounge" },
  Teknik: { sv: 'Teknik', en: 'Tech' },
  'Fællesskab': { sv: 'Gemenskap', en: 'Community' },
  Marked: { sv: 'Marknad', en: 'Marketplace' },
  'Om Zeekr Garage': { sv: 'Om Zeekr Garage', en: 'About Zeekr Garage' },
};

// Kategori-navne. Model-fora (Zeekr 7X, 001 ...) står ens på alle sprog og er
// derfor ikke med - tomt felt = dansk = samme modelnavn.
export const KATEGORI_NAVNE: Readonly<Record<string, Par>> = {
  'Præsentér dig': { sv: 'Presentera dig', en: 'Introduce yourself' },
  'Community-regler': { sv: 'Community-regler', en: 'Community rules' },
  Guides: { sv: 'Guider', en: 'Guides' },
  'Køb, priser & levering': { sv: 'Köp, priser & leverans', en: 'Buying, prices & delivery' },
  'Anmeldelser & langtidstest': { sv: 'Recensioner & långtidstester', en: 'Reviews & long-term tests' },
  'Billeder & videoer': { sv: 'Bilder & videor', en: 'Photos & videos' },
  'Bilpleje & detailing': { sv: 'Bilvård & detailing', en: 'Car care & detailing' },
  'Forsikring, service & værksted': { sv: 'Försäkring, service & verkstad', en: 'Insurance, service & workshops' },
  'Opladning & rækkevidde': { sv: 'Laddning & räckvidd', en: 'Charging & range' },
  'Tilbehør & dele': { sv: 'Tillbehör & delar', en: 'Accessories & parts' },
  'App & infotainment': { sv: 'App & infotainment', en: 'App & infotainment' },
  'Dæk, fælge & undervogn': { sv: 'Däck, fälgar & underrede', en: 'Tyres, wheels & suspension' },
  'DIY & FAQ': { sv: 'DIY & FAQ', en: 'DIY & FAQ' },
  'Træf, køreture & events': { sv: 'Träffar, turer & evenemang', en: 'Meets, drives & events' },
  'Køb, salg & bytte': { sv: 'Köp, sälj & byt', en: 'Buy, sell & swap' },
  'Ønsker og idéer': { sv: 'Önskemål och idéer', en: 'Wishes and ideas' },
  'Fejl og problemer på siden': { sv: 'Fel och problem på sidan', en: 'Bugs and problems on the site' },
  'Nyt fra admin': { sv: 'Nytt från admin', en: 'News from admin' },
};

// Kategori-beskrivelser (som de står live 28-11, inkl. Torbens rettede
// Træf-tekst).
export const KATEGORI_BESKRIVELSER: Readonly<Record<string, Par>> = {
  'Ny her? Sig hej, og fortæl hvilken Zeekr du kører - eller drømmer om.': {
    sv: 'Ny här? Säg hej och berätta vilken Zeekr du kör - eller drömmer om.',
    en: "New here? Say hi and tell us which Zeekr you drive - or dream of.",
  },
  'Sådan holder vi en god, konstruktiv tone. Læs før du poster.': {
    sv: 'Så håller vi en god, konstruktiv ton. Läs innan du skriver.',
    en: 'How we keep a good, constructive tone. Read before you post.',
  },
  'Stab-skrevne guides og vejledninger. Spørgsmål er velkomne i svarene - selve guiderne skriver vi.': {
    sv: 'Guider och instruktioner skrivna av teamet. Frågor är välkomna i svaren - själva guiderna skriver vi.',
    en: 'Guides and how-tos written by the team. Questions are welcome in the replies - the guides themselves are written by us.',
  },
  'Bestilling, priser, leveringstider og dialog med forhandleren.': {
    sv: 'Beställning, priser, leveranstider och kontakten med återförsäljaren.',
    en: 'Ordering, prices, delivery times and dealing with the dealer.',
  },
  'Dine indtryk efter uger og måneder bag rattet.': {
    sv: 'Dina intryck efter veckor och månader bakom ratten.',
    en: 'Your impressions after weeks and months behind the wheel.',
  },
  'Vis din bil frem - foto, clips og roadtrips.': {
    sv: 'Visa upp din bil - foton, klipp och roadtrips.',
    en: 'Show off your car - photos, clips and road trips.',
  },
  'Vask, voks, coating, lakpleje og at holde bilen flot.': {
    sv: 'Tvätt, vax, coating, lackvård och att hålla bilen fin.',
    en: 'Washing, waxing, coating, paint care and keeping the car looking good.',
  },
  'Forsikringsvalg, serviceintervaller, garanti og værkstedserfaringer.': {
    sv: 'Val av försäkring, serviceintervall, garanti och verkstadserfarenheter.',
    en: 'Choosing insurance, service intervals, warranty and workshop experiences.',
  },
  'Ladekurver, forbrug, vinter-rækkevidde og ladenetværk i Norden.': {
    sv: 'Laddkurvor, förbrukning, vinterräckvidd och laddnätverk i Norden.',
    en: 'Charging curves, consumption, winter range and charging networks in the Nordics.',
  },
  'Måtter, tagbøjler, folie, originaldele og aftermarket.': {
    sv: 'Mattor, takräcken, folie, originaldelar och eftermarknad.',
    en: 'Mats, roof bars, wraps, original parts and aftermarket.',
  },
  'Zeekr-app, skærm, lyd, CarPlay/Android og smarte tips.': {
    sv: 'Zeekr-appen, skärm, ljud, CarPlay/Android och smarta tips.',
    en: 'The Zeekr app, screen, audio, CarPlay/Android and clever tips.',
  },
  'Sommer/vinter, dimensioner, fælge, affjedring og alt der ruller.': {
    sv: 'Sommar/vinter, dimensioner, fälgar, fjädring och allt som rullar.',
    en: 'Summer/winter, sizes, wheels, suspension and everything that rolls.',
  },
  'Gør-det-selv-guides, tips og svar på de spørgsmål der går igen.': {
    sv: 'Gör-det-själv-guider, tips och svar på frågorna som återkommer.',
    en: 'Do-it-yourself guides, tips and answers to the questions that keep coming up.',
  },
  'Stedet hvor vi finder ud af at mødes: foreslå en køretur, luft en idé til et træf, find en dato der passer flest. Er planen moden? Så bliver den til et rigtigt event under "Events" i menuen - med tilmelding og "Føj til kalender", så ingen glemmer det.': {
    sv: 'Platsen där vi kommer överens om att ses: föreslå en tur, lufta en idé till en träff, hitta ett datum som passar flest. Är planen klar? Då blir den ett riktigt evenemang under "Evenemang" i menyn - med anmälan och "Lägg till i kalendern", så att ingen glömmer det.',
    en: 'The place where we work out how to meet: suggest a drive, float an idea for a meet, find a date that suits most people. Is the plan ready? Then it becomes a proper event under "Events" in the menu - with sign-up and "Add to calendar", so nobody forgets.',
  },
  'Markedsplads mellem ejere - brugte dele, tilbehør og biler. Privat, ikke erhverv.': {
    sv: 'Marknadsplats mellan ägare - begagnade delar, tillbehör och bilar. Privat, inte företag.',
    en: 'Marketplace between owners - used parts, accessories and cars. Private, not trade.',
  },
  'Hvad kunne gøre zeekr-garage.dk bedre? Foreslå funktioner og forbedringer til selve siden. (Ønsker og fejl til din BIL hører hjemme under Feedback.)': {
    sv: 'Vad skulle göra zeekr-garage.dk bättre? Föreslå funktioner och förbättringar av själva sidan. (Önskemål och fel på din BIL hör hemma under Feedback.)',
    en: 'What would make zeekr-garage.dk better? Suggest features and improvements to the site itself. (Wishes and bugs for your CAR belong under Feedback.)',
  },
  'Noget der ikke virker på selve siden - knapper, visning, login og lignende. (Fejl på din Zeekr meldes under Feedback.)': {
    sv: 'Något som inte fungerar på själva sidan - knappar, visning, inloggning och liknande. (Fel på din Zeekr rapporteras under Feedback.)',
    en: "Something that doesn't work on the site itself - buttons, display, login and the like. (Faults on your Zeekr are reported under Feedback.)",
  },
  'Nyt om siden fra admin - hvad der er lavet, og hvad der er på vej. Kun admin opretter opslag; alle er velkomne i kommentarerne.': {
    sv: 'Nytt om sidan från admin - vad som har gjorts och vad som är på väg. Bara admin skapar inlägg; alla är välkomna i kommentarerna.',
    en: "News about the site from admin - what has been done and what's on the way. Only admin creates posts; everyone is welcome in the comments.",
  },
};

// Model-foraenes standard-beskrivelse (fra admin_opret_model + forum-seed):
// "Alt om <model> - snak, spørgsmål og erfaringer." Migrationens trigger
// udfylder også NYE model-fora med denne skabelon.
export const MODEL_BESKRIVELSE = {
  da: (navn: string) => `Alt om ${navn} - snak, spørgsmål og erfaringer.`,
  sv: (navn: string) => `Allt om ${navn} - snack, frågor och erfarenheter.`,
  en: (navn: string) => `All about ${navn} - chat, questions and experiences.`,
};

// Forum-reglerne (singleton). DA = seed-teksten fra 20261122150000_forum_regler.sql
// (live-tjekket 28-11: uændret). sv/en seedes KUN hvis den danske tekst stadig
// er den (whitespace-normaliseret) - ellers ville oversættelsen være forkert.
export const REGLER_DA = `Velkommen i Garagen. Her er et par enkle spilleregler, så forummet bliver et rart sted for alle Zeekr-ejere. (Moderatorerne kan altid rette teksten her.)

## Tonen
- Tal ordentligt til hinanden - også når I er uenige.
- Vi er et konstruktivt ejer-fællesskab, ikke en klagemur. Vil du se din bil blive bedre, så hjælp os med at gøre feedbacken god.
- Ingen personangreb, hetz eller nedladende sprog.

## Hold trådene skarpe
- Skriv i den rigtige kategori - vælg gerne model-forummet, hvis det handler om en bestemt model.
- Søg først - måske er din tråd allerede i gang.
- Stødt på en rigtig fejl? Opret den på Feedback, så samler vi den struktureret til Zeekr. En forum-tråd forsvinder i mængden.

## Billeder og privatliv
- Del gerne billeder af din bil, men pas på med nummerplader, VIN og andre personlige oplysninger.
- Del ikke andres personlige oplysninger uden lov.

## Marked
- Køb, salg og bytte hører til i Marked-kategorien.
- Zeekr Garage er ikke part i handler mellem ejere - aftal selv det praktiske, og vær forsigtig.

## Moderering
- Moderatorerne kan rette, låse eller fjerne indhold, der bryder reglerne.
- Har du set noget, der ikke hører hjemme? Skriv til en moderator.

Tak fordi du er med til at holde en god stemning. God snak!`;

export const REGLER_SV = `Välkommen till Garaget. Här är några enkla spelregler, så att forumet blir en trevlig plats för alla Zeekr-ägare. (Moderatorerna kan alltid ändra texten här.)

## Tonen
- Var schyssta mot varandra - även när ni inte håller med.
- Vi är en konstruktiv ägargemenskap, inte en klagomur. Vill du se din bil bli bättre, så hjälp oss att göra feedbacken bra.
- Inga personangrepp, hets eller nedlåtande språk.

## Håll trådarna skarpa
- Skriv i rätt kategori - välj gärna modellforumet om det handlar om en viss modell.
- Sök först - kanske är din tråd redan igång.
- Har du hittat ett riktigt fel? Skapa det under Feedback, så samlar vi det strukturerat till Zeekr. En forumtråd försvinner i mängden.

## Bilder och integritet
- Dela gärna bilder på din bil, men akta dig för registreringsskyltar, VIN och andra personuppgifter.
- Dela inte andras personuppgifter utan lov.

## Marknad
- Köp, sälj och byt hör hemma i kategorin Marknad.
- Zeekr Garage är inte part i affärer mellan ägare - kom själva överens om det praktiska, och var försiktiga.

## Moderering
- Moderatorerna kan ändra, låsa eller ta bort innehåll som bryter mot reglerna.
- Har du sett något som inte hör hemma här? Skriv till en moderator.

Tack för att du hjälper till att hålla en god stämning. Trevligt snack!`;

export const REGLER_EN = `Welcome to the Garage. Here are a few simple ground rules, so the forum stays a good place for all Zeekr owners. (The moderators can always edit this text.)

## The tone
- Be decent to each other - also when you disagree.
- We are a constructive owner community, not a complaints wall. If you want to see your car get better, help us make the feedback good.
- No personal attacks, harassment or condescending language.

## Keep threads focused
- Post in the right category - pick the model forum if it is about a specific model.
- Search first - your thread may already be going.
- Found a real fault? Report it under Feedback, so we can collect it in a structured way for Zeekr. A forum thread gets lost in the crowd.

## Photos and privacy
- Feel free to share photos of your car, but watch out for number plates, VIN and other personal details.
- Do not share other people's personal details without permission.

## Marketplace
- Buying, selling and swapping belong in the Marketplace category.
- Zeekr Garage is not a party to deals between owners - sort out the practical details yourselves, and be careful.

## Moderation
- The moderators can edit, lock or remove content that breaks the rules.
- Seen something that does not belong here? Write to a moderator.

Thanks for helping keep a good atmosphere. Happy chatting!`;
