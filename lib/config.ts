// Centraliseret konfiguration - domaene, visningsnavn, statusser, modeller.
// Alt kan overstyres via environment-variabler i Coolify.
//
// UI-i18n (U1): de menneske-læsbare labels bor nu i ordbogen (lib/i18n/da|sv|en).
// Felterne `label`/`navn`/`badge` herunder er den DANSKE udgave (afledt af
// da.ts) for kaldere der endnu ikke er oversat; oversatte flader slår op i
// `t.config.*` på læserens sprog i stedet.

import { da } from '@/lib/i18n/da';

export const SITE = {
  name: process.env.SITE_NAME || 'Zeekr Garage', // i18n-ok (brand)
  domain: process.env.SITE_DOMAIN || 'zeekr-garage.dk',
};

// Dansk udgave; oversatte flader bruger t.ramme.disclaimer(SITE.domain).
export const DISCLAIMER = da.ramme.disclaimer(SITE.domain);

// --- Modeller (fallback) ---
// Den egentlige liste kommer fra databasen (tabellen `models`). Denne bruges kun
// hvis databasen ikke kan naas. Platform-feltet lader os gruppere paa tvaers.
// Modelnavne oversættes ikke (derfor i18n-ok pr. linje).
export const MODEL_FALLBACK = [
  { slug: 'zeekr-9x', name: 'Zeekr 9X', platform: 'SEA-R' }, // i18n-ok
  { slug: 'zeekr-7x', name: 'Zeekr 7X', platform: 'PMA2+' }, // i18n-ok
  { slug: 'zeekr-7gt', name: 'Zeekr 7GT', platform: 'PMA2+' }, // i18n-ok
  { slug: 'zeekr-001', name: 'Zeekr 001', platform: 'SEA1/SEA2' }, // i18n-ok
  { slug: 'zeekr-001-sport', name: 'Zeekr 001 Sport Edition', platform: 'SEA1/SEA2' }, // i18n-ok
  { slug: 'zeekr-x', name: 'Zeekr X', platform: 'SEA1/SEA2' }, // i18n-ok
] as const;

// --- Meldingstype: fejl eller oenske ---
export const ISSUE_TYPES = ['fejl', 'oenske'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const TYPE_META: Record<
  IssueType,
  { navn: string; flertal: string; badge: string; chip: string }
> = {
  fejl: { ...da.config.type.fejl, chip: 'bg-grafit-900 text-white' },
  oenske: { ...da.config.type.oenske, chip: 'bg-kobber-100 text-kobber-800' },
};

export function erGyldigType(t: string | null | undefined): IssueType {
  return t === 'oenske' ? 'oenske' : 'fejl';
}

// --- Alvorlighed ---
export const SEVERITIES = ['lav', 'middel', 'hoej', 'kritisk'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_STYLE: Record<Severity, { label: string; chip: string }> = {
  lav: { label: da.config.alvor.lav, chip: 'bg-grafit-100 text-grafit-600' },
  middel: { label: da.config.alvor.middel, chip: 'bg-kobber-100 text-kobber-800' },
  hoej: { label: da.config.alvor.hoej, chip: 'bg-kobber-200 text-kobber-900' },
  kritisk: { label: da.config.alvor.kritisk, chip: 'bg-grafit-900 text-white' },
};

// --- Status-flow ---
// ny -> bekraeftet -> sendt_til_zeekr -> (afklaret | loest_i_ota)
// afklaret = afsluttet uden OTA-fix (fx fejlinformeret bruger, afklaret i kommentar).
export const STATUSES = ['ny', 'bekraeftet', 'sendt_til_zeekr', 'afklaret', 'loest_i_ota'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_STYLE: Record<Status, { label: string; chip: string; ikon: string }> = {
  ny: { label: da.config.status.ny, chip: 'bg-grafit-100 text-grafit-600', ikon: '•' },
  bekraeftet: { label: da.config.status.bekraeftet, chip: 'bg-kobber-500 text-white', ikon: '✓' },
  sendt_til_zeekr: { label: da.config.status.sendt_til_zeekr, chip: 'bg-grafit-900 text-white', ikon: '→' },
  afklaret: { label: da.config.status.afklaret, chip: 'bg-grafit-200 text-grafit-700', ikon: '💬' },
  loest_i_ota: { label: da.config.status.loest_i_ota, chip: 'bg-loest text-white', ikon: '✓' },
};

// --- Feedback-kategorier (bil-subsystemer, "de 9 spande") ---
// Udledt af meldingerne + Zeekr-manualens inddeling, komprimeret til
// ejer-venlige spande. Lagres som slug i issues.category. Kurateres i
// Værkstedet; brugeren vælger groft ved oprettelse. Fri-tekst-værdier fra
// før denne liste bevares urørt og vises som sig selv (se kategoriLabel).
export const ISSUE_CATEGORY_SLUGS = [
  'koerehjaelp-adas',
  'koersel-bremser-understel',
  'opladning-raekkevidde',
  'skaerm-infotainment',
  'app-laas-forbindelse',
  'lys-ruder-udsyn',
  'klima-saeder-kabine',
  'hjul-daek-tpms',
  'andet',
] as const;

export type IssueCategorySlug = (typeof ISSUE_CATEGORY_SLUGS)[number];

// Dansk label; oversatte flader bruger t.config.kategori[slug].
export const ISSUE_CATEGORIES: readonly { slug: IssueCategorySlug; label: string }[] =
  ISSUE_CATEGORY_SLUGS.map((slug) => ({ slug, label: da.config.kategori[slug] }));

// slug -> label, med fallback til den rå værdi for gamle fri-tekst-kategorier.
export const KATEGORI_LABEL: Record<string, string> = Object.fromEntries(
  ISSUE_CATEGORIES.map((c) => [c.slug, c.label]),
);
export function kategoriLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return KATEGORI_LABEL[slug] ?? slug;
}
