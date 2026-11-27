// U1b: sv/en-oversættelser af de NUVÆRENDE link-grupper og links, keyet på den
// danske tekst. Bruges af kode-fallbacken i lib/links.ts. Den SAMME tabel er seedet
// i migrationen 20261127130000_u1b_links_ota_i18n.sql (kun på rækker der endnu
// ikke er oversat) - scripts/i18n-test.mjs tjekker at de to er ens.
//
// Nye links/grupper oversættes af staben i links-editoren i Værkstedet (felterne
// pr. sprog); denne tabel er kun startpunktet. Rent modul, ingen afhængigheder.

import type { Oversaettelser } from '@/lib/i18n/indhold';

type Par = { sv: string; en: string };

export const GRUPPE_TITLER: Readonly<Record<string, Par>> = {
  'Officielt fra Zeekr': { sv: 'Officiellt från Zeekr', en: 'Official from Zeekr' },
  'Specs & test': { sv: 'Specifikationer & tester', en: 'Specs & tests' },
  'Køb, pris & leasing': { sv: 'Köp, pris & leasing', en: 'Buying, prices & leasing' },
  'Tilbehør & dele': { sv: 'Tillbehör & delar', en: 'Accessories & parts' },
  'Praktisk & fællesskab': { sv: 'Praktiskt & gemenskap', en: 'Practical & community' },
};

export const LINK_NAVNE: Readonly<Record<string, Par>> = {
  'Officiel modelside': { sv: 'Officiell modellsida', en: 'Official model page' },
  'Connected Services': { sv: 'Connected Services', en: 'Connected Services' },
  'Brugermanualer & kontakt': { sv: 'Instruktionsböcker & kontakt', en: "Owner's manuals & contact" },
  'Tekniske detaljer': { sv: 'Tekniska detaljer', en: 'Technical details' },
  'Anmeldelse & test': { sv: 'Recension & test', en: 'Review & test' },
  'Test & anmeldelse': { sv: 'Test & recension', en: 'Test & review' },
  'Pris & info': { sv: 'Pris & info', en: 'Price & info' },
  'Erhverv & leasing': { sv: 'Företag & leasing', en: 'Business & leasing' },
  Privatleasing: { sv: 'Privatleasing', en: 'Private leasing' },
  'Nye biler': { sv: 'Nya bilar', en: 'New cars' },
  'Biler på markedet': { sv: 'Bilar till salu', en: 'Cars for sale' },
  Eftermarkedsudstyr: { sv: 'Eftermarknadstillbehör', en: 'Aftermarket accessories' },
  'Eftermarkedsudstyr (globalt)': { sv: 'Eftermarknadstillbehör (globalt)', en: 'Aftermarket accessories (global)' },
  'Fælge & dæk': { sv: 'Fälgar & däck', en: 'Wheels & tyres' },
  Vinduesviskere: { sv: 'Torkarblad', en: 'Wiper blades' },
  'Fragt- & biltracking': { sv: 'Frakt- & bilspårning', en: 'Shipping & car tracking' },
  'Fællesskab & erfaringer': { sv: 'Gemenskap & erfarenheter', en: 'Community & experiences' },
};

// Kun kilder der er tekst; domæner (zeekr.eu, fdm.dk ...) er ens på alle sprog.
export const LINK_KILDER: Readonly<Record<string, Par>> = {
  'zeekr.eu · alle modeller': { sv: 'zeekr.eu · alla modeller', en: 'zeekr.eu · all models' },
  'Facebook-gruppe': { sv: 'Facebook-grupp', en: 'Facebook group' },
};

export function gruppeOversaettelser(titel: string): Oversaettelser<'titel'> {
  const t = GRUPPE_TITLER[titel];
  return t ? { sv: { titel: t.sv }, en: { titel: t.en } } : {};
}

export function linkOversaettelser(navn: string, kilde: string | null): Oversaettelser<'navn' | 'kilde'> {
  const n = LINK_NAVNE[navn];
  const k = kilde ? LINK_KILDER[kilde] : undefined;
  if (!n && !k) return {};
  return {
    sv: { ...(n ? { navn: n.sv } : {}), ...(k ? { kilde: k.sv } : {}) },
    en: { ...(n ? { navn: n.en } : {}), ...(k ? { kilde: k.en } : {}) },
  };
}
