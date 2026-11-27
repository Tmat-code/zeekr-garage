// U1b: maskinoversættelse af OTA-noterne på /software til læserens UI-sprog.
// MÅ ALDRIG importeres i klient-kode (service-role + node:crypto via lib/oversaet).
//
// Motor = RAPPORTENS pipeline (lib/oversaet.ts -> oversaetFraDansk): rensning,
// term-beskyttelse med dansk ORDLISTE/BEVAR (inkl. versionsnumre og Zeekr-
// funktionsnavne), sætning-for-sætning, sprog-løs-værn, sv via en-pivot med BEVAR.
// IKKE forummets rå gist: OTA-noterne er dansk bil-fagtekst, præcis hvad ordlisten
// er tunet til.
//
// Cache: `ota_oversaettelser` (PK update_id + sprog, kilde_hash = MOTOR_ID +
// changelog + note). PRIVAT tabel - kun service-role (her) læser/skriver, fordi
// læseren af /software ofte er anonym (samme valg som forum_post_translations).
//
// LÆSEREN VENTER ALDRIG (U1b, efter live-test 27-11 - en kold oversættelse af
// alle opslag tog 30-40 s og pressede Pixa): siden læser KUN cachen. Mangler
// noget (nyt/rettet opslag, motor-bump), vises originalen, og oversættelsen
// lægges i en baggrunds-kø. Køen er SERIEL for hele processen (én LibreTranslate-
// opgave ad gangen, uanset hvor mange læsere der kommer samtidig) og dedupliseret
// pr. sprog, så et sprog højst står i kø én gang.

import { supabaseService } from '@/lib/supabase/service';
import { oversaetFraDansk, oversaetKildeHash, oversaetterKonfigureret } from '@/lib/oversaet';
import { oversaetOtaKerne, type OtaKilde, type OtaOversat } from '@/lib/ota-oversaet-kerne';
import { OTA_SELECT, tilUpdate } from '@/lib/ota';
import type { UiSprog } from '@/lib/i18n/sprog';
import type { OtaModelHistorik, SoftwareUpdate } from '@/lib/types';

type Maal = 'sv' | 'en';
const KLUMP = 6; // opslag pr. motorkald i baggrunden - godt under LT's 30 s-timeout

async function koerKerne(kilder: OtaKilde[], maal: Maal, maksNye: number): Promise<Map<string, OtaOversat>> {
  if (kilder.length === 0) return new Map();
  const svc = supabaseService();
  return oversaetOtaKerne(kilder, {
    noegle: oversaetKildeHash,
    maksNye,
    hentCache: async (ids) => {
      const { data, error } = await svc
        .from('ota_oversaettelser')
        .select('update_id, kilde_hash, punkter, note')
        .in('update_id', ids)
        .eq('sprog', maal);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    skrivCache: async (raekker) => {
      const { error } = await svc.from('ota_oversaettelser').upsert(
        raekker.map((r) => ({ ...r, sprog: maal, updated_at: new Date().toISOString() })),
        { onConflict: 'update_id,sprog' },
      );
      if (error) console.error('[ota-oversaet] kunne ikke cache:', error.message);
    },
    oversaet: (tekster) => oversaetFraDansk(tekster, maal),
  });
}

function tilKilde(u: SoftwareUpdate): OtaKilde {
  return { id: u.id, punkter: u.punkter, note: u.note };
}

function harIndhold(u: SoftwareUpdate): boolean {
  return u.punkter.length > 0 || !!(u.note ?? '').trim();
}

// --- Baggrunds-kø (pr. Node-proces; Pixa kører én app-instans) ---------------
let koe: Promise<void> = Promise.resolve();
const ventende = new Set<Maal>();

// Hent ALLE opslag friskt med service-role (kører uden for en request, så ingen
// cookies), og oversæt de manglende i klumper til alt er dækket eller et kald ikke
// gav fremgang (motor nede).
async function varmSprog(maal: Maal): Promise<void> {
  const { data, error } = await supabaseService().from('software_updates').select(OTA_SELECT);
  if (error || !data) return;
  const kilder = (data as any[]).map((r) => tilUpdate(r)).filter(harIndhold).map(tilKilde);
  let forrige = -1;
  for (let i = 0; i <= Math.ceil(kilder.length / KLUMP); i++) {
    const n = (await koerKerne(kilder, maal, KLUMP)).size;
    if (n >= kilder.length || n === forrige) break;
    forrige = n;
  }
}

// Læg sprog i køen (no-op for et sprog der allerede venter). `ventende` ryddes
// når jobbet STARTER, så en ændring midt under et job giver et nyt job bagefter.
// Kaldes af /software (ved cache-miss) og efter admin-gem af et OTA-opslag.
export function planlaegOtaOversaettelse(sprog: readonly Maal[] = ['en', 'sv']): void {
  if (!oversaetterKonfigureret()) return;
  for (const maal of sprog) {
    if (ventende.has(maal)) continue;
    ventende.add(maal);
    koe = koe
      .then(async () => {
        ventende.delete(maal);
        await varmSprog(maal);
      })
      .catch((e) => console.error(`[ota-oversaet] baggrunds-oversættelse ${maal} fejlede:`, e));
  }
}

// Påfør CACHEDE oversættelser på historikken (samme opslag kan stå under flere
// modeller). Dansk -> uændret. Mangler noget, vises originalen for det opslag, og
// sproget lægges i baggrunds-køen - siden venter aldrig på LibreTranslate.
export async function oversaetOtaHistorik(
  modeller: OtaModelHistorik[],
  sprog: UiSprog,
): Promise<OtaModelHistorik[]> {
  if (sprog === 'da' || modeller.length === 0 || !oversaetterKonfigureret()) return modeller;
  const unikke = new Map<string, SoftwareUpdate>();
  for (const m of modeller) for (const u of m.opdateringer) unikke.set(u.id, u);

  let oversat: Map<string, OtaOversat>;
  try {
    oversat = await koerKerne([...unikke.values()].map(tilKilde), sprog, 0); // kun cache
  } catch (e) {
    console.error('[ota-oversaet] cache-opslag fejlede, viser original:', e);
    return modeller;
  }
  const mangler = [...unikke.values()].some((u) => harIndhold(u) && !oversat.has(u.id));
  if (mangler) planlaegOtaOversaettelse([sprog]);

  return modeller.map((m) => ({
    ...m,
    opdateringer: m.opdateringer.map((u) => ({ ...u, oversat: oversat.get(u.id) ?? null })),
  }));
}
