'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase/service';
import { bestemKildesprog, gaetKildesprog } from '@/lib/kildesprog';
import { ltDetekt } from '@/lib/oversaet';
import { planlaegTitelOversaettelse } from '@/lib/titel-oversaet';

// U3b (a): efter en ny melding er oprettet (MeldForm indsætter direkte med
// klientens session). DB-triggeren har allerede sat issues.sprog med
// heuristikken; her forfines det med LibreTranslate /detect når heuristikken er
// usikker, og titlen lægges i baggrunds-oversættelsen (boardet + søgningen).
// Teksten læses AUTORITATIVT fra DB'en (ikke fra klienten), og kun opretteren
// selv kan udløse det. Best-effort: fejler noget, står heuristikkens sprog.
export async function efterMeldingOprettet(issueId: string): Promise<void> {
  try {
    const sb = supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    const svc = supabaseService();
    const { data: issue } = await svc
      .from('issues')
      .select('id, title, description, sprog, created_by')
      .eq('id', issueId)
      .maybeSingle();
    if (!issue || issue.created_by !== user.id) return;

    const tekst = `${issue.title ?? ''}\n${issue.description ?? ''}`;
    const gaet = gaetKildesprog(tekst);
    const lt = gaet.sikker ? null : (await ltDetekt(tekst)).sprog;
    const sprog = bestemKildesprog(gaet, lt);
    if (sprog !== issue.sprog) {
      await svc.from('issues').update({ sprog }).eq('id', issueId);
    }
    planlaegTitelOversaettelse();
    revalidatePath('/feedback');
  } catch (e) {
    console.error('[meld] efterMeldingOprettet fejlede (ignoreres):', e);
  }
}
