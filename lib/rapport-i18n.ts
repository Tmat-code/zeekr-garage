// Oversættelser af selve RAPPORTENS ramme (labels, overskrifter, disclaimer, status).
// Selve meldings-teksten (titel + beskrivelse) oversættes separat i lib/oversaet.ts.
// Sprog i eksporten: dansk (da), engelsk (en), svensk (sv).

import { SITE } from '@/lib/config';
import type { Status } from '@/lib/config';

export const RAPPORT_SPROG = ['da', 'en', 'sv'] as const;
export type RapportSprog = (typeof RAPPORT_SPROG)[number];

export function erGyldigtSprog(s: string | null): RapportSprog {
  return (RAPPORT_SPROG as readonly string[]).includes(s ?? '') ? (s as RapportSprog) : 'da';
}

// Målsprog-koder til LibreTranslate. 'da' = kildesprog (ingen oversættelse).
export const MAALSPROG: Record<RapportSprog, string | null> = { da: null, en: 'en', sv: 'sv' };

export const DATO_LOCALE: Record<RapportSprog, string> = {
  da: 'da-DK',
  en: 'en-GB',
  sv: 'sv-SE',
};

export type RapportType = 'fejl' | 'oenske' | 'begge';

export function erGyldigRapportType(s: string | null): RapportType {
  return s === 'oenske' ? 'oenske' : s === 'begge' ? 'begge' : 'fejl';
}

export const TYPE_FILNAVN: Record<RapportSprog, Record<RapportType, string>> = {
  da: { fejl: 'fejl', oenske: 'oensker', begge: 'alt' },
  en: { fejl: 'bugs', oenske: 'wishes', begge: 'all' },
  sv: { fejl: 'fel', oenske: 'onskemal', begge: 'allt' },
};

type Tekster = {
  sprognavn: string;
  undertitel: string;
  genereret: (dato: string, antal: number) => string;
  metaLabels: { model: string; software: string; status: string; telefon: string; bilBekraeftet: string };
  stemme: string;
  stemmer: string;
  svar: string;
  kommentarerOverskrift: string;
  sideAf: (n: number, af: number) => string;
  delta: { ny: string; mere: (n: number) => string };
  csvKolonner: string[];
  disclaimer: string;
  filnavn: string;
  status: Record<Status, string>;
};

export const I18N: Record<RapportSprog, Tekster> = {
  da: {
    sprognavn: 'Dansk',
    undertitel: `Uofficielt, uafhængigt ejer-community for Zeekr - ${SITE.domain}`,
    genereret: (dato, antal) => `Genereret ${dato} · ${antal} poster`,
    metaLabels: { model: 'Model', software: 'Software', status: 'Status', telefon: 'Telefon', bilBekraeftet: 'Biler bekræftet' },
    stemme: 'stemme',
    stemmer: 'stemmer',
    svar: 'svar',
    kommentarerOverskrift: 'Kommentarer',
    sideAf: (n, af) => `Side ${n} af ${af}`,
    delta: { ny: 'NY', mere: (n) => `+${n} siden sidst` },
    csvKolonner: ['Placering', 'Stemmer', 'Ændring siden sidst', 'Biler bekræftet', 'Varianter', 'Antal svar', 'Titel', 'Modeller', 'Softwareversion', 'Telefon', 'Telefon-OS', 'Status', 'Beskrivelse', 'Oprettet', 'Kommentarer'],
    disclaimer: `${SITE.domain} er et uofficielt, uafhængigt ejer-community. Siden er ikke tilknyttet, sponsoreret eller godkendt af ZEEKR, Geely eller deres datterselskaber.`,
    filnavn: 'da',
    status: { ny: 'Ny', bekraeftet: 'Bekræftet', sendt_til_zeekr: 'Sendt til Zeekr', loest_i_ota: 'Løst i OTA' },
  },
  en: {
    sprognavn: 'English',
    undertitel: `Unofficial, independent owner community for Zeekr - ${SITE.domain}`,
    genereret: (dato, antal) => `Generated ${dato} · ${antal} entries`,
    metaLabels: { model: 'Model', software: 'Software', status: 'Status', telefon: 'Phone', bilBekraeftet: 'Cars confirmed' },
    stemme: 'vote',
    stemmer: 'votes',
    svar: 'replies',
    kommentarerOverskrift: 'Comments',
    sideAf: (n, af) => `Page ${n} of ${af}`,
    delta: { ny: 'NEW', mere: (n) => `+${n} since last` },
    csvKolonner: ['Rank', 'Votes', 'Change since last', 'Cars confirmed', 'Variants', 'Replies', 'Title', 'Models', 'Software version', 'Phone', 'Phone OS', 'Status', 'Description', 'Created', 'Comments'],
    disclaimer: `${SITE.domain} is an unofficial, independent owner community. The site is not affiliated with, sponsored by or endorsed by ZEEKR, Geely or their subsidiaries.`,
    filnavn: 'en',
    status: { ny: 'New', bekraeftet: 'Confirmed', sendt_til_zeekr: 'Sent to Zeekr', loest_i_ota: 'Fixed in OTA' },
  },
  sv: {
    sprognavn: 'Svenska',
    undertitel: `Inofficiell, oberoende ägargemenskap för Zeekr - ${SITE.domain}`,
    genereret: (dato, antal) => `Genererad ${dato} · ${antal} poster`,
    metaLabels: { model: 'Modell', software: 'Programvara', status: 'Status', telefon: 'Telefon', bilBekraeftet: 'Bilar bekräftade' },
    stemme: 'röst',
    stemmer: 'röster',
    svar: 'svar',
    kommentarerOverskrift: 'Kommentarer',
    sideAf: (n, af) => `Sida ${n} av ${af}`,
    delta: { ny: 'NY', mere: (n) => `+${n} sedan sist` },
    csvKolonner: ['Placering', 'Röster', 'Förändring sedan sist', 'Bilar bekräftade', 'Varianter', 'Antal svar', 'Titel', 'Modeller', 'Programvaruversion', 'Telefon', 'Telefon-OS', 'Status', 'Beskrivning', 'Skapad', 'Kommentarer'],
    disclaimer: `${SITE.domain} är en inofficiell, oberoende ägargemenskap. Sidan är inte knuten till, sponsrad av eller godkänd av ZEEKR, Geely eller deras dotterbolag.`,
    filnavn: 'sv',
    status: { ny: 'Ny', bekraeftet: 'Bekräftad', sendt_til_zeekr: 'Skickad till Zeekr', loest_i_ota: 'Löst i OTA' },
  },
};

export const RAPPORT_RAMME: Record<RapportSprog, Record<RapportType, { titel: string; intro: string }>> = {
  da: {
    fejl: { titel: 'ZEEKR GARAGE - FEJLRAPPORT', intro: 'Denne rapport samler de softwarefejl, som flest ejere i fællesskabet har bekræftet at opleve. Hver post viser antal bekræftelser (biler), berørte modeller, softwareversion og en beskrivelse.' },
    oenske: { titel: 'ZEEKR GARAGE - ØNSKE-RAPPORT', intro: 'Denne rapport samler de ønsker til ny funktionalitet, som flest ejere har stemt på. Hver post viser antal stemmer, berørte modeller og en beskrivelse.' },
    begge: { titel: 'ZEEKR GARAGE - FEJL & ØNSKER', intro: 'Denne rapport samler både bekræftede softwarefejl og ønsker fra Zeekr-fællesskabet, sorteret efter antal stemmer.' },
  },
  en: {
    fejl: { titel: 'ZEEKR GARAGE - BUG REPORT', intro: 'This report compiles the software issues that the most owners in the community have confirmed. Each entry shows the number of confirmations (cars), affected models, software version and a description.' },
    oenske: { titel: 'ZEEKR GARAGE - FEATURE REQUESTS', intro: 'This report compiles the feature requests that the most owners have voted for. Each entry shows the number of votes, affected models and a description.' },
    begge: { titel: 'ZEEKR GARAGE - BUGS & REQUESTS', intro: 'This report compiles both confirmed software issues and feature requests from the Zeekr community, sorted by number of votes.' },
  },
  sv: {
    fejl: { titel: 'ZEEKR GARAGE - FELRAPPORT', intro: 'Den här rapporten samlar de programvarufel som flest ägare har bekräftat. Varje post visar antal bekräftelser (bilar), berörda modeller, programvaruversion och en beskrivning.' },
    oenske: { titel: 'ZEEKR GARAGE - ÖNSKEMÅL', intro: 'Den här rapporten samlar de önskemål som flest ägare har röstat på. Varje post visar antal röster, berörda modeller och en beskrivning.' },
    begge: { titel: 'ZEEKR GARAGE - FEL & ÖNSKEMÅL', intro: 'Den här rapporten samlar både bekräftade programvarufel och önskemål från Zeekr-gemenskapen, sorterade efter antal röster.' },
  },
};

export function oversaetStatus(status: string, sprog: RapportSprog): string {
  const map = I18N[sprog].status as Record<string, string>;
  return map[status] ?? status;
}

export function deltaTekst(
  f: { stemmer: number; sidst_sendt_stemmer: number | null; sidst_sendt_dato: string | null },
  sprog: RapportSprog,
): string {
  if (!f.sidst_sendt_dato) return I18N[sprog].delta.ny;
  const vaekst = f.stemmer - (f.sidst_sendt_stemmer ?? 0);
  return vaekst > 0 ? I18N[sprog].delta.mere(vaekst) : '';
}
