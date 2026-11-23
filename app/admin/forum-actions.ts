'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { erModerator } from '@/lib/admin';

function slugify(s: string): string {
  const base = s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'kategori';
}

function revalider() {
  revalidatePath('/admin/forum');
  revalidatePath('/forum');
}

// Gem de fælles forum-regler (singleton). Moderator/admin.
export async function gemForumRegler(content: string): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { error } = await sb
    .from('forum_rules')
    .update({
      content: content.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forum');
  revalidatePath('/forum');
  revalidatePath('/forum/regler');
}

async function kraevModerator() {
  if (!(await erModerator())) throw new Error('Kun moderator/admin.');
}

// Opret en ny kategori i en (eksisterende eller ny) gruppe.
export async function opretKategori(input: {
  name: string;
  groupLabel: string;
  icon?: string;
  description?: string;
}): Promise<void> {
  await kraevModerator();
  const navn = input.name.trim();
  const gruppe = input.groupLabel.trim();
  if (!navn) throw new Error('Giv kategorien et navn.');
  if (!gruppe) throw new Error('Vælg eller skriv en gruppe.');

  const sb = supabaseServer();
  const { data: alle } = await sb
    .from('forum_categories')
    .select('slug, group_label, group_order, display_order');
  const liste = (alle ?? []) as any[];

  // Gruppe-rækkefølge: genbrug hvis gruppen findes, ellers næste ledige.
  const iGruppen = liste.filter((c) => c.group_label === gruppe);
  const groupOrder =
    iGruppen.length > 0
      ? iGruppen[0].group_order
      : Math.max(0, ...liste.map((c) => c.group_order ?? 0)) + 1;
  const displayOrder = Math.max(0, ...iGruppen.map((c) => c.display_order ?? 0)) + 1;

  // Unik slug.
  let slug = slugify(navn);
  const brugte = new Set(liste.map((c) => c.slug));
  if (brugte.has(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await sb.from('forum_categories').insert({
    slug,
    name: navn,
    description: input.description?.trim() || null,
    icon: input.icon?.trim() || '💬',
    group_label: gruppe,
    group_order: groupOrder,
    display_order: displayOrder,
  });
  if (error) throw new Error(error.message);
  revalider();
}

// Ret navn/beskrivelse/ikon (slug holdes stabil for ikke at bryde URL'er).
export async function retKategori(
  id: string,
  patch: { name?: string; description?: string | null; icon?: string },
): Promise<void> {
  await kraevModerator();
  const data: Record<string, any> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) throw new Error('Navnet må ikke være tomt.');
    data.name = n;
  }
  if (patch.description !== undefined) data.description = patch.description?.trim() || null;
  if (patch.icon !== undefined) data.icon = patch.icon.trim() || '💬';

  const sb = supabaseServer();
  const { error } = await sb.from('forum_categories').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalider();
}

export async function saetKategoriLaast(id: string, vaerd: boolean): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();
  const { error } = await sb.from('forum_categories').update({ is_locked: vaerd }).eq('id', id);
  if (error) throw new Error(error.message);
  revalider();
}

// Flyt op/ned i sin gruppe (bytter display_order med nabo).
export async function flytKategori(id: string, retning: 'op' | 'ned'): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();
  const { data: mig } = await sb
    .from('forum_categories')
    .select('id, group_label, display_order')
    .eq('id', id)
    .single();
  if (!mig) throw new Error('Kategorien findes ikke.');

  const { data: gruppe } = await sb
    .from('forum_categories')
    .select('id, display_order')
    .eq('group_label', (mig as any).group_label)
    .order('display_order', { ascending: true });
  const liste = (gruppe ?? []) as any[];
  const idx = liste.findIndex((c) => c.id === id);
  const naboIdx = retning === 'op' ? idx - 1 : idx + 1;
  if (naboIdx < 0 || naboIdx >= liste.length) return; // yderpunkt - ingenting

  const nabo = liste[naboIdx];
  // Byt display_order.
  await sb.from('forum_categories').update({ display_order: nabo.display_order }).eq('id', id);
  await sb
    .from('forum_categories')
    .update({ display_order: (mig as any).display_order })
    .eq('id', nabo.id);
  revalider();
}

// Hvilke gruppe-labels rummer model-fora? (model_id != null => "Modellerne"-gruppen,
// uanset hvad den er døbt). Model-foraene er rygraden og holdes i deres gruppe.
function modelGruppeLabels(liste: any[]): Set<string> {
  const s = new Set<string>();
  for (const c of liste) if (c.model_id != null) s.add(c.group_label);
  return s;
}

// Flyt en kategori til en ANDEN eksisterende gruppe (ændrer group_label +
// group_order, og lægger den sidst i målgruppen). Ét rækkes-update => atomisk.
// Model-fora kan ikke flyttes, og ingen kategori kan flyttes ind i model-gruppen.
export async function flytKategoriTilGruppe(id: string, maalGruppe: string): Promise<void> {
  await kraevModerator();
  const gruppe = maalGruppe.trim();
  if (!gruppe) throw new Error('Vælg en gruppe.');

  const sb = supabaseServer();
  const { data: alle } = await sb
    .from('forum_categories')
    .select('id, group_label, group_order, display_order, model_id');
  const liste = (alle ?? []) as any[];
  const mig = liste.find((c) => c.id === id);
  if (!mig) throw new Error('Kategorien findes ikke.');

  if (mig.model_id != null) {
    throw new Error('Model-fora hører til i Modellerne og kan ikke flyttes mellem grupper.');
  }
  if (gruppe === mig.group_label) return; // allerede i gruppen

  const modelGrupper = modelGruppeLabels(liste);
  if (modelGrupper.has(gruppe)) {
    throw new Error('Modellerne er forbeholdt model-fora.');
  }

  const iMaal = liste.filter((c) => c.group_label === gruppe);
  if (iMaal.length === 0) throw new Error('Gruppen findes ikke.');

  const groupOrder = iMaal[0].group_order;
  const displayOrder = Math.max(0, ...iMaal.map((c) => c.display_order ?? 0)) + 1;

  const { error } = await sb
    .from('forum_categories')
    .update({ group_label: gruppe, group_order: groupOrder, display_order: displayOrder })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalider();
}

// Omsortér hele grupper (bytter group_order med nabogruppen). group_order er
// denormaliseret på hver række i gruppen => to bulk-updates, én pr. gruppe.
// Ingen unique-constraint på group_order, så et direkte bytte er sikkert.
export async function flytGruppe(label: string, retning: 'op' | 'ned'): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();
  const { data: alle } = await sb.from('forum_categories').select('group_label, group_order');
  const liste = (alle ?? []) as any[];

  // Distinkte grupper i vist rækkefølge (group_order, så label).
  const perGruppe = new Map<string, number>();
  for (const c of liste) {
    if (!perGruppe.has(c.group_label)) perGruppe.set(c.group_label, c.group_order ?? 0);
  }
  const grupper = [...perGruppe.entries()]
    .map(([l, o]) => ({ label: l, order: o }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'da'));

  const idx = grupper.findIndex((g) => g.label === label);
  if (idx < 0) throw new Error('Gruppen findes ikke.');
  const naboIdx = retning === 'op' ? idx - 1 : idx + 1;
  if (naboIdx < 0 || naboIdx >= grupper.length) return; // yderpunkt

  const mig = grupper[idx];
  const nabo = grupper[naboIdx];
  // Byt group_order på alle rækker i hver af de to grupper.
  const r1 = await sb
    .from('forum_categories')
    .update({ group_order: nabo.order })
    .eq('group_label', mig.label);
  if (r1.error) throw new Error(r1.error.message);
  const r2 = await sb
    .from('forum_categories')
    .update({ group_order: mig.order })
    .eq('group_label', nabo.label);
  if (r2.error) throw new Error(r2.error.message);
  revalider();
}

// Slet en kategori - kun hvis den er tom (cascade ville ellers slette tråde).
export async function sletKategori(id: string): Promise<void> {
  await kraevModerator();
  const sb = supabaseServer();
  const { count } = await sb
    .from('forum_threads')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('is_removed', false);
  if ((count ?? 0) > 0) {
    throw new Error(`Kategorien har ${count} tråd(e) - flyt eller fjern dem først.`);
  }
  const { error } = await sb.from('forum_categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalider();
}
