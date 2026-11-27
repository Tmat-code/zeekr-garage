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

import { supabaseService } from '@/lib/supabase/service';
import { oversaetFraDansk, oversaetKildeHash, oversaetterKonfigureret } from '@/lib/oversaet';
import { oversaetOtaKerne, type OtaKilde, type OtaOversat } from '@/lib/ota-oversaet-kerne';
import type { UiSprog } from '@/lib/i18n/sprog';
import type { OtaModelHistorik, SoftwareUpdate } from '@/lib/types';

// Højst så mange NYE opslag oversættes pr. sidevisning (resten vises på dansk og
// tages ved næste visning). Admin-gem varmer cachen, så læsere sjældent rammer det.
const MAKS_NYE_PR_VISNING = 8;

async function oversaetOpslag(
  kilder: OtaKilde[],
  maal: 'sv' | 'en',
  maksNye: number,
): Promise<Map<string, OtaOversat>> {
  if (!oversaetterKonfigureret() || kilder.length === 0) return new Map();
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

// Påfør oversættelser på historikken (samme opslag kan stå under flere modeller -
// oversættes én gang). Dansk -> uændret. Fejl -> uændret (originalen vises).
export async function oversaetOtaHistorik(
  modeller: OtaModelHistorik[],
  sprog: UiSprog,
): Promise<OtaModelHistorik[]> {
  if (sprog === 'da' || modeller.length === 0) return modeller;
  const unikke = new Map<string, SoftwareUpdate>();
  for (const m of modeller) for (const u of m.opdateringer) unikke.set(u.id, u);

  let oversat: Map<string, OtaOversat>;
  try {
    oversat = await oversaetOpslag([...unikke.values()].map(tilKilde), sprog, MAKS_NYE_PR_VISNING);
  } catch (e) {
    console.error('[ota-oversaet] fejlede, viser original:', e);
    return modeller;
  }
  return modeller.map((m) => ({
    ...m,
    opdateringer: m.opdateringer.map((u) => ({ ...u, oversat: oversat.get(u.id) ?? null })),
  }));
}

// Varm cachen for ALLE opslag på sv + en (kaldes efter admin-gem). Best-effort.
export async function forvarmOtaOversaettelser(opslag: SoftwareUpdate[]): Promise<void> {
  if (!oversaetterKonfigureret() || opslag.length === 0) return;
  const kilder = opslag.map(tilKilde);
  const KLUMP = 6; // små kald -> godt under LibreTranslates 30s-timeout pr. kald
  for (const maal of ['en', 'sv'] as const) {
    let forrige = -1;
    // Hvert kald læser cachen igen og oversætter de næste KLUMP manglende; stop når
    // alt er dækket eller et kald ikke gav fremgang (motor nede).
    for (let i = 0; i <= Math.ceil(kilder.length / KLUMP); i++) {
      try {
        const n = (await oversaetOpslag(kilder, maal, KLUMP)).size;
        if (n >= kilder.length || n === forrige) break;
        forrige = n;
      } catch (e) {
        console.error(`[ota-oversaet] forvarm ${maal} fejlede:`, e);
        break;
      }
    }
  }
}
