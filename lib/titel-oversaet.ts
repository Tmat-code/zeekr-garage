// U3b (c): titel-oversættelser til feedback-boardet + søgningen.
// MÅ ALDRIG importeres i klient-kode (service-role + node:crypto via lib/oversaet).
//
// Cache: `issue_titel_oversaettelser` (PK issue_id + sprog, kilde_hash = MOTOR_ID +
// kildesprog + titel). PRIVAT tabel - kun service-role (her).
//
// LÆSEREN VENTER ALDRIG (samme valg som OTA-noterne i U1b): siderne læser KUN
// cachen. Mangler noget (ny/rettet melding, motor-bump), vises originalen, og
// oversættelserne lægges i en baggrunds-kø der er SERIEL for hele processen og
// dedupliseret (højst ét ventende job). Efter en ny melding kaldes køen direkte
// (efterMeldingOprettet), så titlen typisk er oversat få sekunder efter.
//
// Motor: oversaetFraKilde (lib/oversaet.ts) - da-kilder via rapportens
// da-pipeline (ordliste + BEVAR), sv/en-kilder uden den danske ordliste.

import { supabaseService } from '@/lib/supabase/service';
import { oversaetFraKilde, oversaetKildeHash, oversaetterKonfigureret } from '@/lib/oversaet';
import {
  anvendTitelCache,
  klumpOpgaver,
  oversaetKlump,
  type TitelCacheRaekke,
  type TitelKilde,
} from '@/lib/titel-oversaet-kerne';
import { erKildesprog } from '@/lib/kildesprog';
import type { IssueRow } from '@/lib/types';

const KLUMP = 10; // titler pr. motorkald - korte strenge, godt under LT's 30 s

async function hentCache(ids: string[]): Promise<TitelCacheRaekke[]> {
  if (ids.length === 0) return [];
  const svc = supabaseService();
  const ud: TitelCacheRaekke[] = [];
  // PostgREST-URL'en må ikke blive for lang: hent i bidder af 150 id'er.
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await svc
      .from('issue_titel_oversaettelser')
      .select('issue_id, sprog, kilde_hash, titel')
      .in('issue_id', ids.slice(i, i + 150));
    if (error) throw error;
    ud.push(...((data ?? []) as TitelCacheRaekke[]));
  }
  return ud;
}

// --- Baggrunds-kø (pr. Node-proces; Pixa kører én app-instans) ---------------
let koe: Promise<void> = Promise.resolve();
let venter = false;

async function varmTitler(): Promise<void> {
  const svc = supabaseService();
  // P43: skjulte dubletter oversættes ikke (de vises ingen steder).
  let { data, error } = await svc.from('issues').select('id, title, sprog').is('sammenlagt_i', null);
  if (error) ({ data, error } = await svc.from('issues').select('id, title, sprog'));
  if (error || !data) return;
  const kilder: TitelKilde[] = (data as any[]).map((r) => ({
    id: r.id,
    title: r.title ?? '',
    sprog: erKildesprog(r.sprog) ? r.sprog : 'da',
  }));
  const { mangler } = anvendTitelCache(kilder, await hentCache(kilder.map((k) => k.id)), oversaetKildeHash);
  for (const klump of klumpOpgaver(mangler, KLUMP)) {
    try {
      const raekker = await oversaetKlump(klump, oversaetFraKilde);
      if (raekker.length === 0) continue;
      const { error: e } = await svc.from('issue_titel_oversaettelser').upsert(
        raekker.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: 'issue_id,sprog' },
      );
      if (e) console.error('[titel-oversaet] kunne ikke cache:', e.message);
    } catch (e) {
      // Motoren nede: stop runden (næste visning planlægger en ny).
      console.error('[titel-oversaet] klump fejlede, stopper runden:', e);
      return;
    }
  }
}

// Læg en runde i køen (no-op hvis en allerede venter). `venter` ryddes når
// runden STARTER, så en ny melding midt i en runde giver én runde mere bagefter.
export function planlaegTitelOversaettelse(): void {
  if (!oversaetterKonfigureret() || venter) return;
  venter = true;
  koe = koe
    .then(async () => {
      venter = false;
      await varmTitler();
    })
    .catch((e) => console.error('[titel-oversaet] baggrunds-runde fejlede:', e));
}

// Påfør CACHEDE titel-oversættelser på meldingerne (alle sprog - søgningen
// matcher på tværs). Mangler noget, planlægges en baggrunds-runde; siden venter
// aldrig. Fejler cache-opslaget (fx tabellen findes ikke endnu), returneres
// meldingerne uændret.
export async function medTitelOversaettelser(issues: IssueRow[]): Promise<IssueRow[]> {
  if (issues.length === 0 || !oversaetterKonfigureret()) return issues;
  let res: ReturnType<typeof anvendTitelCache>;
  try {
    res = anvendTitelCache(
      issues.map((i) => ({ id: i.id, title: i.title, sprog: i.sprog })),
      await hentCache(issues.map((i) => i.id)),
      oversaetKildeHash,
    );
  } catch (e) {
    console.error('[titel-oversaet] cache-opslag fejlede, viser originaler:', e);
    return issues;
  }
  if (res.mangler.length > 0) planlaegTitelOversaettelse();
  return issues.map((i) => ({ ...i, titler: res.titler.get(i.id) ?? {} }));
}
