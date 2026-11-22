import { supabaseServer } from '@/lib/supabase/server';
import type { RapportType, RapportSprog } from '@/lib/rapport-i18n';
import { oversaetTekster } from '@/lib/oversaet';
import { ISSUE_CATEGORIES } from '@/lib/config';

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
  }));

  // Kategori ligger ikke i rapport_fejl-RPC'en (undgår migration) - hentes
  // separat fra issues (offentlig læsning) og mappes på. Fri-tekst-værdier
  // bevares urørt; grupperingen falder tilbage via kategoriLabel().
  if (fejl.length > 0) {
    const { data: katRows } = await sb
      .from('issues')
      .select('id, category')
      .in('id', fejl.map((f) => f.id));
    const katMap = new Map<string, string | null>();
    for (const r of (katRows ?? []) as any[]) katMap.set(r.id, r.category ?? null);
    for (const f of fejl) f.category = katMap.get(f.id) ?? null;
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
    .select('issue_id, body, author_navn, profiles ( display_name )')
    .in('issue_id', issueIds)
    .eq('is_solution', false)
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as any[];
  const tekster = rows.map((r) => r.body as string);
  const oversatte = await oversaetTekster(tekster, sprog);

  const map: Record<string, { navn: string; tekst: string }[]> = {};
  rows.forEach((r, i) => {
    (map[r.issue_id] ??= []).push({
      navn: r.profiles?.display_name ?? r.author_navn ?? 'Ejer',
      tekst: oversatte[i] ?? r.body,
    });
  });
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
