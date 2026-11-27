// UI-i18n (U1): rene sprog-hjælpere. INGEN node-/Next-moduler, så både server,
// klient og enhedstests kan bruge dem. Selve opslaget af cookie/header/profil
// sker i server.ts; HER bor kun reglerne (testbare).
//
// UI-sprog: da / sv / en. Norsk er bevidst IKKE et UI-sprog (parkeret 27-11):
// nb/nn/no -> engelsk. Bemærk at reglen for TOM header afviger fra forum-knappens
// `laeserSprog` (tom -> en): UI'et falder til dansk (sitets hjemsprog), så
// crawlere og link-preview-bots ser den danske udgave.

export const UI_SPROG = ['da', 'sv', 'en'] as const;
export type UiSprog = (typeof UI_SPROG)[number];

export const STANDARD_SPROG: UiSprog = 'da';

// Cookie der husker sprogvælgerens valg (1 år, SameSite=Lax).
export const SPROG_COOKIE = 'zg_sprog';
export const SPROG_COOKIE_MAKS_ALDER = 60 * 60 * 24 * 365;

// Hvert sprog skrevet på sig selv (vises ens uanset UI-sprog i vælgeren).
export const SPROG_EGET_NAVN: Record<UiSprog, string> = {
  da: 'Dansk',
  sv: 'Svenska',
  en: 'English',
};

export function erUiSprog(s: unknown): s is UiSprog {
  return typeof s === 'string' && (UI_SPROG as readonly string[]).includes(s);
}

// Accept-Language -> UI-sprog. Tager det højest prioriterede sprog-tag (q-værdi,
// stabil rækkefølge ved lighed): da* -> da, sv* -> sv, alt andet kendt (inkl.
// norsk nb/nn/no og en) -> en. Tom/manglende header eller kun "*" -> da.
export function uiSprogFraHeader(acceptLanguage: string | null | undefined): UiSprog {
  const tags = (acceptLanguage ?? '')
    .split(',')
    .map((del, i) => {
      const [tag, ...params] = del.split(';').map((x) => x.trim());
      const qParam = params.find((p) => p.toLowerCase().startsWith('q='));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return { tag: (tag ?? '').toLowerCase(), q: Number.isFinite(q) ? q : 0, i };
    })
    .filter((t) => t.tag && t.tag !== '*' && t.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  if (tags.length === 0) return 'da';
  const primaer = tags[0].tag.split('-')[0];
  if (primaer === 'da') return 'da';
  if (primaer === 'sv') return 'sv';
  return 'en';
}

// Opløsnings-rækkefølgen for UI-sproget: (1) indlogget brugers profil-sprog,
// (2) cookien fra sprogvælgeren, (3) browserens Accept-Language, (4) dansk.
// Ugyldige værdier (fx en manipuleret cookie) springes over.
export function oploesSprog(kilder: {
  profil?: string | null;
  cookie?: string | null;
  header?: string | null;
}): UiSprog {
  if (erUiSprog(kilder.profil)) return kilder.profil;
  if (erUiSprog(kilder.cookie)) return kilder.cookie;
  return uiSprogFraHeader(kilder.header);
}

// Synk ved login: hvad skal skrives hvor? Profilen er sandheden, når den er sat.
// Er den tom, overtager den cookiens sprog (første gang) - og findes der ingen
// cookie (fx bekræftelses-link åbnet i en anden browser), sprogets fra signup
// (user_metadata.sprog). Rent plan-resultat, så det kan testes uden DB.
export type SynkPlan = {
  saetCookie: UiSprog | null;
  saetProfil: UiSprog | null;
  saetMetadata: UiSprog | null;
};

export function synkPlan(kilder: {
  profil?: string | null;
  cookie?: string | null;
  metadata?: string | null;
}): SynkPlan {
  const cookie = erUiSprog(kilder.cookie) ? kilder.cookie : null;
  const meta = erUiSprog(kilder.metadata) ? kilder.metadata : null;
  if (erUiSprog(kilder.profil)) {
    const p = kilder.profil;
    return {
      saetCookie: cookie === p ? null : p,
      saetProfil: null,
      saetMetadata: meta === p ? null : p,
    };
  }
  const kilde = cookie ?? meta;
  if (!kilde) return { saetCookie: null, saetProfil: null, saetMetadata: null };
  return {
    saetCookie: cookie === kilde ? null : kilde,
    saetProfil: kilde,
    saetMetadata: meta === kilde ? null : kilde,
  };
}
