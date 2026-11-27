import { supabaseServer } from '@/lib/supabase/server';
import type { RapportType, RapportSprog } from '@/lib/rapport-i18n';
import { oversaetKommentarer } from '@/lib/oversaet';
import type { KommentarInput } from '@/lib/rapport-kommentar-cache';
import { ISSUE_CATEGORIES } from '@/lib/config';
import { erKildesprog, type Kildesprog } from '@/lib/kildesprog';
import { meldBilledeUrl, MELD_MAKS_BILLEDER } from '@/lib/billeder';

export type RapportFejl = {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  software_version: string | null;
  phone_model: string | null;
  phone_os: string | null;
  created_at: string;
  modeller: string;
  stemmer: number;
  antal_svar: number;
  sidst_sendt_stemmer: number | null;
  sidst_sendt_dato: string | null;
  variant_fordeling: { variant: string; n: number }[];
  category: string | null;
  // U3b: meldingens kildesprog (issues.sprog). Styrer rapport-oversættelsen.
  sprog: Kildesprog;
};

export async function getRapportFejl(
  type: RapportType,
  kunAendrede: boolean,
  antal: number,
): Promise<RapportFejl[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.rpc('rapport_fejl', {
    p_type: type,
    p_kun_aendrede: kunAendrede,
    p_antal: antal,
  });
  if (error || !data) return [];
  const fejl: RapportFejl[] = (data as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    severity: r.severity,
    status: r.status,
    software_version: r.software_version,
    phone_model: r.phone_model,
    phone_os: r.phone_os,
    created_at: r.created_at,
    modeller: r.modeller ?? '',
    stemmer: Number(r.stemmer ?? 0),
    antal_svar: Number(r.antal_svar ?? 0),
    sidst_sendt_stemmer: r.sidst_sendt_stemmer === null ? null : Number(r.sidst_sendt_stemmer),
    sidst_sendt_dato: r.sidst_sendt_dato ?? null,
    variant_fordeling: Array.isArray(r.variant_fordeling) ? r.variant_fordeling : [],
    category: null,
    sprog: 'da' as Kildesprog,
  }));

  // Kategori ligger ikke i rapport_fejl-RPC'en (undgår migration) - hentes
  // separat fra issues (offentlig læsning) og mappes på. Fri-tekst-værdier
  // bevares urørt; grupperingen falder tilbage via kategoriLabel().
  // U3b: kildesproget hentes samme vej (sprog-kolonnen). Defensivt: findes
  // kolonnen ikke (migrationen ikke kørt), hentes kun kategori, og alt er 'da'.
  if (fejl.length > 0) {
    const ids = fejl.map((f) => f.id);
    const forsoeg = await sb.from('issues').select('id, category, sprog').in('id', ids);
    let katRows: any[] | null = forsoeg.data as any[] | null;
    if (forsoeg.error) katRows = (await sb.from('issues').select('id, category').in('id', ids)).data as any[] | null;
    const katMap = new Map<string, { category: string | null; sprog: Kildesprog }>();
    for (const r of (katRows ?? []) as any[]) {
      katMap.set(r.id, { category: r.category ?? null, sprog: erKildesprog(r.sprog) ? r.sprog : 'da' });
    }
    for (const f of fejl) {
      f.category = katMap.get(f.id)?.category ?? null;
      f.sprog = katMap.get(f.id)?.sprog ?? 'da';
    }
  }

  return fejl;
}

// --- Gruppering efter kategori-spand (QA-vinklen til Zeekr) ---
// Samler meldingerne i de 9 faste spande (config-rækkefølge), derefter evt.
// ukendte fri-tekst-kategorier (første-forekomst-rækkefølge), og til sidst en
// "uden kategori"-gruppe (slug = null). Hver gruppe aggregeres: antal, samlede
// stemmer og samlede bil-bekræftelser. Visningslabel resolves i rapport-i18n.
export type RapportGruppe = {
  slug: string | null;
  fejl: RapportFejl[];
  antal: number;
  stemmer: number;
  bilerBekraeftet: number;
};

export function grupperEfterKategori(fejl: RapportFejl[]): RapportGruppe[] {
  const kendt = ISSUE_CATEGORIES.map((c) => c.slug) as string[];
  const grupper = new Map<string, RapportFejl[]>();
  const udenKat: RapportFejl[] = [];
  const ukendtRaekkefoelge: string[] = [];

  for (const f of fejl) {
    const slug = f.category?.trim();
    if (!slug) {
      udenKat.push(f);
      continue;
    }
    if (!grupper.has(slug)) {
      grupper.set(slug, []);
      if (!kendt.includes(slug)) ukendtRaekkefoelge.push(slug);
    }
    grupper.get(slug)!.push(f);
  }

  const raekkefoelge = [...kendt.filter((s) => grupper.has(s)), ...ukendtRaekkefoelge];

  const lav = (slug: string | null, liste: RapportFejl[]): RapportGruppe => ({
    slug,
    fejl: liste,
    antal: liste.length,
    stemmer: liste.reduce((s, f) => s + f.stemmer, 0),
    bilerBekraeftet: liste.reduce(
      (s, f) => s + f.variant_fordeling.reduce((a, r) => a + r.n, 0),
      0,
    ),
  });

  const ud: RapportGruppe[] = raekkefoelge.map((s) => lav(s, grupper.get(s)!));
  if (udenKat.length > 0) ud.push(lav(null, udenKat));
  return ud;
}

export type RapportOverblik = {
  sidst: { navn: string; antal: number; dato: string } | null;
  nye: number;
  eskaleret: number;
  ekstra_stemmer: number;
};

export async function getRapportOverblik(): Promise<RapportOverblik> {
  const sb = supabaseServer();
  const { data } = await sb.rpc('rapport_overblik');
  const o = (data ?? {}) as any;
  return {
    sidst: o.sidst ?? null,
    nye: Number(o.nye ?? 0),
    eskaleret: Number(o.eskaleret ?? 0),
    ekstra_stemmer: Number(o.ekstra_stemmer ?? 0),
  };
}

// Kommentarer til rapporten: ejernes kommentarer pr. melding, UDEN den markerede
// løsning (Zeekr skal have fejlen, ikke workaround'en). Valgfrit oversat.
export async function getRapportKommentarer(
  issueIds: string[],
  sprog: RapportSprog,
): Promise<Record<string, { navn: string; tekst: string }[]>> {
  if (issueIds.length === 0) return {};
  const sb = supabaseServer();
  const { data } = await sb
    .from('comments')
    .select('id, issue_id, body, author_navn, profiles ( display_name )')
    .in('issue_id', issueIds)
    .eq('is_solution', false)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as any[];
  // comment-id med videre til den holdbare DB-cache (PK comment_id), så en redigeret
  // kommentar giver cache-miss og et slet cascader rækken væk.
  const komm = rows.map((r) => ({ id: r.id as string, tekst: r.body as string }));
  const oversatte = await oversaetKommentarer(komm, sprog);

  const map: Record<string, { navn: string; tekst: string }[]> = {};
  rows.forEach((r, i) => {
    (map[r.issue_id] ??= []).push({
      navn: r.profiles?.display_name ?? r.author_navn ?? 'Ejer',
      tekst: oversatte[i] ?? r.body,
    });
  });
  return map;
}

// Rå kommentar-udvalg til opvarmningen (trin 2.7): PRÆCIS samme kommentarer som
// getRapportKommentarer fodrer oversaetKommentarer med (ejernes kommentarer pr.
// melding, UDEN den markerede løsning), men UOVERSAT og flad - så opvarmningen kan
// skære udvalget i bundne vinduer og fylde `kommentar_oversaettelser`-cachen klump
// for klump. Ordenen er fuldt deterministisk (created_at, så comment-id som
// tie-break), så den globale offset peger på de SAMME kommentarer mellem genforsøg
// og intet springes over ved et afbrudt forsøg.
export async function getRapportKommentarRaa(issueIds: string[]): Promise<KommentarInput[]> {
  if (issueIds.length === 0) return [];
  const sb = supabaseServer();
  const { data } = await sb
    .from('comments')
    .select('id, body')
    .in('issue_id', issueIds)
    .eq('is_solution', false)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  return ((data ?? []) as any[]).map((r) => ({ id: r.id as string, tekst: r.body as string }));
}

// Foto-bevis pr. melding (P37): de OFFENTLIGE billed-URL'er pr. issue, så de kan
// tages med i Zeekr-rapporten. Hentes separat fra issue_images (offentlig læsning,
// public 'meld'-bucket) - SAMME separat-fetch-mønster som kategori i getRapportFejl
// (ingen migration, rapport_fejl-RPC'en urørt). Sorteret på display_order, cappet
// til MELD_MAKS_BILLEDER pr. melding (matcher P36; ældre meldinger kan have op til
// 6). Gælder både fejl og ønske - issueIds afgør udvalget, ikke typen.
export async function getRapportBilleder(
  issueIds: string[],
): Promise<Record<string, string[]>> {
  if (issueIds.length === 0) return {};
  const sb = supabaseServer();
  const { data } = await sb
    .from('issue_images')
    .select('issue_id, path, display_order')
    .in('issue_id', issueIds)
    .order('display_order', { ascending: true });

  const map: Record<string, string[]> = {};
  for (const r of (data ?? []) as any[]) {
    const liste = (map[r.issue_id] ??= []);
    if (liste.length < MELD_MAKS_BILLEDER) liste.push(meldBilledeUrl(r.path));
  }
  return map;
}

export type RapportLogPost = {
  id: number;
  navn: string;
  rolle: string;
  format: string;
  type: string;
  antal: string;
  kun_aendrede: boolean;
  med_kommentarer: boolean;
  created_at: string;
};

export async function getRapportLog(graense = 20): Promise<RapportLogPost[]> {
  const sb = supabaseServer();
  const { data } = await sb
    .from('rapport_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(graense);
  return (data ?? []) as RapportLogPost[];
}
