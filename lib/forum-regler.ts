import { supabaseServer } from '@/lib/supabase/server';
import { lokaliserTekst } from '@/lib/forum-kategori-i18n';
import { rensOversaettelser, OVERSAETTELSE_MAKS_REGLER, type Oversaettelser } from '@/lib/i18n/indhold';
import type { UiSprog } from '@/lib/i18n/sprog';

// Redigerbare forum-regler (singleton, id = 1). Se migration
// 20261122150000_forum_regler.sql. Teksten redigeres fra Værkstedet
// (/admin/forum) og vises på /forum/regler. U7: sv/en i `oversaettelser`
// (migration 20261128090000), tomt felt = dansk.

export type ForumRegler = {
  content: string; // på det ønskede sprog (dansk fallback)
  updatedAt: string | null;
  contentDa: string; // den danske kilde (editoren)
  oversaettelser: Oversaettelser<'content'>;
};

// Henter reglerne. Robust: hvis migrationen endnu ikke er kørt i Studio
// (tabellen/kolonnen findes ikke) degraderes blødt - uden kolonnen vises dansk,
// uden tabellen { content: '' }, og visnings-siden falder tilbage til en
// "reglerne er på vej"-besked.
export async function getForumRegler(sprog: UiSprog = 'da'): Promise<ForumRegler> {
  const sb = supabaseServer();
  const hent = (cols: string) => sb.from('forum_rules').select(cols).eq('id', 1).maybeSingle();
  let { data, error } = await hent('content, updated_at, oversaettelser'); // i18n-ok (kolonner)
  if (error && String(error.message ?? '').includes('oversaettelser')) {
    ({ data, error } = await hent('content, updated_at')); // i18n-ok (kolonner)
  }

  if (error) {
    // Tabellen mangler (migration ikke kørt) eller anden læsefejl - fejl blødt.
    return { content: '', updatedAt: null, contentDa: '', oversaettelser: {} };
  }
  const r = (data ?? {}) as any;
  const da = (r.content as string | null) ?? '';
  return {
    content: lokaliserTekst(da, r.oversaettelser, 'content', sprog, OVERSAETTELSE_MAKS_REGLER),
    updatedAt: (r.updated_at as string | null) ?? null,
    contentDa: da,
    oversaettelser: rensOversaettelser(r.oversaettelser, ['content'], OVERSAETTELSE_MAKS_REGLER),
  };
}
