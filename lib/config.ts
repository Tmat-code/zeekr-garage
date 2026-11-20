// Centraliseret konfiguration — domaene, visningsnavn, statusser, modeller.
// Alt kan overstyres via environment-variabler i Coolify.

export const SITE = {
  name: process.env.SITE_NAME || 'Zeekr Garage',
  domain: process.env.SITE_DOMAIN || 'zeekr-garage.dk',
};

export const DISCLAIMER =
  `${SITE.domain} er et uofficielt, uafhaengigt ejer-community. ` +
  `Siden er ikke tilknyttet, sponsoreret eller godkendt af ZEEKR, Geely ` +
  `eller deres datterselskaber.`;

// --- Modeller (fallback) ---
// Den egentlige liste kommer fra databasen (tabellen `models`). Denne bruges kun
// hvis databasen ikke kan naas. Platform-feltet lader os gruppere paa tvaers.
export const MODEL_FALLBACK = [
  { slug: 'zeekr-9x', name: 'Zeekr 9X', platform: 'SEA-R' },
  { slug: 'zeekr-7x', name: 'Zeekr 7X', platform: 'PMA2+' },
  { slug: 'zeekr-7gt', name: 'Zeekr 7GT', platform: 'PMA2+' },
  { slug: 'zeekr-001', name: 'Zeekr 001', platform: 'SEA1/SEA2' },
  { slug: 'zeekr-001-sport', name: 'Zeekr 001 Sport Edition', platform: 'SEA1/SEA2' },
  { slug: 'zeekr-x', name: 'Zeekr X', platform: 'SEA1/SEA2' },
] as const;

// --- Alvorlighed ---
export const SEVERITIES = ['lav', 'middel', 'hoej', 'kritisk'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_STYLE: Record<Severity, { label: string; chip: string }> = {
  lav: { label: 'Lav', chip: 'bg-grafit-100 text-grafit-600' },
  middel: { label: 'Middel', chip: 'bg-kobber-100 text-kobber-800' },
  hoej: { label: 'Hoej', chip: 'bg-kobber-200 text-kobber-900' },
  kritisk: { label: 'Kritisk', chip: 'bg-grafit-900 text-white' },
};

// --- Status-flow ---
// ny -> bekraeftet -> sendt_til_zeekr -> loest_i_ota
export const STATUSES = ['ny', 'bekraeftet', 'sendt_til_zeekr', 'loest_i_ota'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_STYLE: Record<Status, { label: string; chip: string; ikon: string }> = {
  ny: { label: 'Ny', chip: 'bg-grafit-100 text-grafit-600', ikon: '•' },
  bekraeftet: { label: 'Bekraeftet', chip: 'bg-kobber-500 text-white', ikon: '✓' },
  sendt_til_zeekr: { label: 'Sendt til Zeekr', chip: 'bg-grafit-900 text-white', ikon: '→' },
  loest_i_ota: { label: 'Loest i OTA', chip: 'bg-loest text-white', ikon: '✓' },
};
