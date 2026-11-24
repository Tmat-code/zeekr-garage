import { supabaseServer } from '@/lib/supabase/server';
import type { OtaModel, OtaModelHistorik, SoftwareUpdate } from '@/lib/types';

// OTA-historik (P27). Data'en bor i DB (software_updates + software_update_models,
// admin-styret via Vaerkstedet). Ingen fallback-indhold som /links: en OTA-historik
// er bruger-/ejer-data, ikke en kurateret statisk liste, saa en tom eller endnu-ikke-
// migreret DB vises aerligt som "ingen opslag endnu" i stedet for opdigtet indhold.
// Degraderer dog PAENT: hvis tabellen mangler (kode deployet foer migrationen er
// koert i Studio), sluger vi fejlen og returnerer tom liste - ingen crash.

// Changelog -> liste af punkter: een linje pr. punkt, trimmet, tomme linjer ude.
export function splitChangelog(changelog: string): string[] {
  return (changelog ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// Raa raekke -> SoftwareUpdate. modelFilter: hvis sat, beholdes kun modeller der
// passerer (bruges til at filtrere arkiverede fra i den offentlige visning).
function tilUpdate(
  r: any,
  modelFilter?: (m: any) => boolean,
): SoftwareUpdate {
  const modeller: OtaModel[] = ((r.software_update_models ?? []) as any[])
    .map((sm) => sm.model)
    .filter(Boolean)
    .filter((m: any) => (modelFilter ? modelFilter(m) : true))
    .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((m: any) => ({ slug: m.slug, name: m.name }));
  return {
    id: r.id,
    version: r.version,
    releasedAt: r.released_at,
    changelog: r.changelog ?? '',
    punkter: splitChangelog(r.changelog ?? ''),
    note: r.note ?? null,
    modeller,
    createdAt: r.created_at,
  };
}

// Nyeste foerst: released_at desc, created_at desc som tie-break.
function nyesteFoerst(a: SoftwareUpdate, b: SoftwareUpdate): number {
  if (a.releasedAt !== b.releasedAt) return a.releasedAt < b.releasedAt ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
}

const SELECT =
  'id, version, released_at, changelog, note, created_at, ' +
  'software_update_models ( model:models ( id, slug, name, display_order, archived ) )';

// Offentlig historik grupperet pr. model, nyeste version oeverst pr. model.
// Arkiverede modeller (P18) filtreres fra: et opslag der KUN gaelder arkiverede
// modeller forsvinder fra den offentlige visning (modellen er taget ud af omloeb),
// men bevares i basen. Kun modeller med >= 1 opslag faar en blok.
export async function getSoftwareHistorikPerModel(): Promise<OtaModelHistorik[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from('software_updates').select(SELECT);
  if (error || !data) return [];

  // Byg map: model-slug -> { meta, opdateringer }. Et opslag med flere modeller
  // lander under hver (ikke-arkiveret) model.
  const perModel = new Map<
    string,
    { slug: string; name: string; displayOrder: number; opdateringer: SoftwareUpdate[] }
  >();

  for (const r of data as any[]) {
    const upd = tilUpdate(r);
    for (const sm of (r.software_update_models ?? []) as any[]) {
      const m = sm.model;
      if (!m || m.archived) continue; // arkiveret model filtreres fra
      const key = m.slug as string;
      if (!perModel.has(key)) {
        perModel.set(key, {
          slug: m.slug,
          name: m.name,
          displayOrder: m.display_order ?? 0,
          opdateringer: [],
        });
      }
      perModel.get(key)!.opdateringer.push(upd);
    }
  }

  const grupper: OtaModelHistorik[] = Array.from(perModel.values())
    .map((g) => {
      const opdateringer = [...g.opdateringer].sort(nyesteFoerst);
      return {
        slug: g.slug,
        name: g.name,
        displayOrder: g.displayOrder,
        nyesteVersion: opdateringer[0]?.version ?? null,
        opdateringer,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return grupper;
}

// Flad admin-liste: alle opslag, nyeste foerst, med alle koblede modeller
// (ogsaa arkiverede - admin skal kunne se/rette dem). Degraderer til tom liste.
export async function getAlleSoftwareUpdates(): Promise<SoftwareUpdate[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from('software_updates').select(SELECT);
  if (error || !data) return [];
  return (data as any[]).map((r) => tilUpdate(r)).sort(nyesteFoerst);
}
