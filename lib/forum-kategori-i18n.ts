// U7: forum-kategorier, -grupper, -regler og forside-besked på læserens sprog.
// Rent modul (ingen Next/Supabase), så det kan testes isoleret
// (scripts/i18n-test.mjs). DB-adgangen ligger i lib/forum.ts, lib/forum-regler.ts
// og lib/queries.ts, der kalder herind.

import { oversatFelt, rensOversaettelser, OVERSAETTELSE_MAKS_KATEGORI } from './i18n/indhold';
import type { UiSprog } from './i18n/sprog';
import type { ForumKategori, KategoriOversaettelser } from './types';

export const KATEGORI_FELTER = ['name', 'description', 'group_label'] as const;

// Rå DB-værdi -> rensede oversættelser (tåler null, manglende kolonne m.m.).
export function laesKategoriOversaettelser(raw: unknown): KategoriOversaettelser {
  return rensOversaettelser(raw, KATEGORI_FELTER, OVERSAETTELSE_MAKS_KATEGORI);
}

// Navn, beskrivelse og gruppe-label på læserens sprog. Dansk (eller tomt felt)
// = den danske tekst. groupKey (dansk) og oversaettelser bevares uændret.
export function lokaliserKategori<K extends ForumKategori>(k: K, sprog: UiSprog): K {
  if (sprog === 'da') return k;
  const ov = k.oversaettelser;
  return {
    ...k,
    name: oversatFelt(k.name, ov, sprog, 'name') ?? k.name,
    description: oversatFelt(k.description, ov, sprog, 'description'),
    groupLabel: oversatFelt(k.groupKey, ov, sprog, 'group_label') ?? k.groupKey,
  };
}

// En gruppes viste label: den første kategori i gruppen med en oversættelse
// (DB'en holder dem ens, men en enkelt række uden må ikke give dansk for hele
// gruppen).
export function gruppeLabel(
  noegle: string,
  kategorier: readonly Pick<ForumKategori, 'oversaettelser'>[],
  sprog: UiSprog,
): string {
  if (sprog === 'da') return noegle;
  for (const k of kategorier) {
    const v = oversatFelt(noegle, k.oversaettelser, sprog, 'group_label');
    if (v && v !== noegle) return v;
  }
  return noegle;
}

// Enkelt-felts tekster (regler: content, forside-besked: message).
export function lokaliserTekst<F extends string>(
  dansk: string,
  raw: unknown,
  felt: F,
  sprog: UiSprog,
  maks: number,
): string {
  if (sprog === 'da' || !dansk.trim()) return dansk;
  return oversatFelt(dansk, rensOversaettelser(raw, [felt], maks), sprog, felt) ?? dansk;
}
