// U3b (c): ren, testbar kerne for titel-oversættelser på feedback-boardet.
// Ingen app-imports: hash, cache og motor injiceres (lib/titel-oversaet.ts wirer
// dem). Samme mønster som ota-oversaet-kerne.ts.
//
// Hver melding får sin titel oversat til de to ANDRE sprog (da/sv/en minus
// kildesproget). Originalen er record; oversættelserne er læsehjælp + søge-
// grundlag, så en svensker der søger "bromsar" finder den danske "bremser"-melding.

import { KILDESPROG, type Kildesprog } from './kildesprog';
import { spejlSlut } from './ota-oversaet-kerne';

export type TitelKilde = { id: string; title: string; sprog: Kildesprog };
export type TitelCacheRaekke = { issue_id: string; sprog: string; kilde_hash: string; titel: string };
export type TitelOpgave = { id: string; title: string; kilde: Kildesprog; maal: Kildesprog; hash: string };

// Kanonisk cache-nøgle-tekst: kildesprog + titel (et rettet kildesprog eller en
// rettet titel giver cache-miss). MOTOR_ID foldes ind af den injicerede hash.
export function titelKildeTekst(k: Pick<TitelKilde, 'title' | 'sprog'>): string {
  return `${k.sprog}\n${k.title}`;
}

export function maalSprogFor(kilde: Kildesprog): Kildesprog[] {
  return KILDESPROG.filter((s) => s !== kilde);
}

// Påfør cachen: gyldige oversættelser pr. melding + listen af manglende opgaver.
export function anvendTitelCache(
  kilder: TitelKilde[],
  cache: TitelCacheRaekke[],
  noegle: (tekst: string) => string,
): { titler: Map<string, Partial<Record<Kildesprog, string>>>; mangler: TitelOpgave[] } {
  const c = new Map<string, TitelCacheRaekke>();
  for (const r of cache) c.set(`${r.issue_id}|${r.sprog}`, r);
  const titler = new Map<string, Partial<Record<Kildesprog, string>>>();
  const mangler: TitelOpgave[] = [];
  for (const k of kilder) {
    if (!k.title.trim()) continue;
    const hash = noegle(titelKildeTekst(k));
    const ud: Partial<Record<Kildesprog, string>> = {};
    for (const maal of maalSprogFor(k.sprog)) {
      const r = c.get(`${k.id}|${maal}`);
      if (r && r.kilde_hash === hash && r.titel.trim()) ud[maal] = r.titel;
      else mangler.push({ id: k.id, title: k.title, kilde: k.sprog, maal, hash });
    }
    titler.set(k.id, ud);
  }
  return { titler, mangler };
}

// Grupperér manglende opgaver pr. (kilde, mål) og skær i klumper - hver klump
// er ét kald-forløb mod motoren.
export function klumpOpgaver(opgaver: TitelOpgave[], klump: number): TitelOpgave[][] {
  const grupper = new Map<string, TitelOpgave[]>();
  for (const o of opgaver) {
    const n = `${o.kilde}>${o.maal}`;
    (grupper.get(n) ?? grupper.set(n, []).get(n)!).push(o);
  }
  const ud: TitelOpgave[][] = [];
  for (const liste of grupper.values()) {
    for (let i = 0; i < liste.length; i += klump) ud.push(liste.slice(i, i + klump));
  }
  return ud;
}

// Oversæt én klump (samme kilde/mål). Kun ikke-tomme resultater caches; en
// motor-fejl kastes videre (kalderen springer klumpen over, prøver igen senere).
export async function oversaetKlump(
  klump: TitelOpgave[],
  oversaet: (tekster: string[], kilde: Kildesprog, maal: Kildesprog) => Promise<string[]>,
): Promise<{ issue_id: string; sprog: Kildesprog; kilde_hash: string; titel: string }[]> {
  if (klump.length === 0) return [];
  const { kilde, maal } = klump[0];
  const raa = await oversaet(klump.map((o) => o.title), kilde, maal);
  const ud: { issue_id: string; sprog: Kildesprog; kilde_hash: string; titel: string }[] = [];
  klump.forEach((o, i) => {
    // Rensningen sætter punktum efter en titel uden tegnsætning - fjernes igen,
    // så den oversatte titel ser ud som originalen (samme regel som OTA-noterne).
    const t = spejlSlut(o.title, raa[i] ?? '');
    if (t) ud.push({ issue_id: o.id, sprog: maal, kilde_hash: o.hash, titel: t });
  });
  return ud;
}

// Let stamme-reduktion af et SØGE-ord (ikke af teksten): skræl én typisk
// skandinavisk/engelsk bøjningsendelse af, så "bromsar" -> "broms" finder
// "Nödbromsning", og "bremser" -> "brems" finder "Nødbremsning". Stammen skal
// være mindst 4 tegn, ellers bruges ordet som det er (korte ord matcher eksakt).
const ENDELSER = [
  'ningarna', 'ningerne', 'ningen', 'ningar', 'ninger', 'ning',
  'arna', 'erna', 'arne', 'erne', 'ande', 'ende', 'ing', 'ar', 'er', 'or', 'en', 'et', 'na', 'ne', 'es', 's', 'e',
];
export function soegeStamme(ord: string): string {
  const o = ord.toLowerCase();
  for (const e of ENDELSER) {
    if (o.endsWith(e) && o.length - e.length >= 4) return o.slice(0, -e.length);
  }
  return o;
}

export function soegeOrd(q: string): string[] {
  return q.trim().toLowerCase().split(/\s+/).filter(Boolean).map(soegeStamme);
}

// Søge-match på tværs af sprog (board + MeldFlow-dublet-tjekket): et ord
// matcher hvis (stammen af) det står i titlen, beskrivelsen, kategorien ELLER i
// en af titlens oversættelser. Returnerer antal matchende ord (0 = intet match).
// `ord` skal komme fra soegeOrd (allerede stamme-reduceret).
export function soegeTraef(
  issue: { title: string; description: string; titler: Partial<Record<Kildesprog, string>> },
  ekstra: string[],
  ord: string[],
): number {
  const hay = [issue.title, issue.description, ...Object.values(issue.titler), ...ekstra]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  return ord.filter((o) => hay.includes(o)).length;
}

// Titlen på læserens sprog, hvis meldingen er på et andet sprog og der findes en
// oversættelse - ellers null (vis originalen).
export function titelPaaSprog(
  issue: { title: string; sprog: Kildesprog; titler: Partial<Record<Kildesprog, string>> },
  laeser: Kildesprog,
): string | null {
  if (issue.sprog === laeser) return null;
  const t = issue.titler[laeser];
  return t && t.trim() ? t : null;
}
