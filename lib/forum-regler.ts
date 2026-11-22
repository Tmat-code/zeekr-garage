import { supabaseServer } from '@/lib/supabase/server';

// Redigerbare forum-regler (singleton, id = 1). Se migration
// 20261122150000_forum_regler.sql. Teksten redigeres fra Værkstedet
// (/admin/forum) og vises på /forum/regler.

export type ForumRegler = {
  content: string;
  updatedAt: string | null;
};

// Henter reglerne. Robust: hvis migrationen endnu ikke er kørt i Studio
// (tabellen findes ikke) returneres { content: '', updatedAt: null } i stedet
// for at vælte forum-siderne. Visnings-siden falder så tilbage til en
// "reglerne er på vej"-besked.
export async function getForumRegler(): Promise<ForumRegler> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('forum_rules')
    .select('content, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    // Tabellen mangler (migration ikke kørt) eller anden læsefejl - fejl blødt.
    return { content: '', updatedAt: null };
  }
  return {
    content: (data?.content as string | null) ?? '',
    updatedAt: (data?.updated_at as string | null) ?? null,
  };
}
