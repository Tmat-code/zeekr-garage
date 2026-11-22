import { supabaseServer } from '@/lib/supabase/server';
import type { SamtaleRow, SamtaleDetalje, AndenPart, Besked } from '@/lib/types';

// Embed af en deltagers profil + bil (garage-badge), samme FK-hints som forum.
const PART_SELECT = `user_id, last_read_at,
  profil:profiles!conversation_participants_user_id_fkey (
    display_name,
    bil:models!profiles_car_model_id_fkey ( name ),
    variant:variants!profiles_car_variant_id_fkey ( name )
  )`;

function mapPart(p: any): AndenPart {
  const pr = p?.profil;
  const modelNavn = pr?.bil?.name ?? null;
  const variantNavn = pr?.variant?.name ?? null;
  const bil = modelNavn ? (variantNavn ? `${modelNavn} · ${variantNavn}` : modelNavn) : null;
  return { id: p.user_id, navn: pr?.display_name ?? null, bil };
}

async function minId(): Promise<string | null> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user?.id ?? null;
}

// Indbakke: mine samtaler, nyeste øverst, med anden part + seneste besked + ulæst.
export async function getSamtaler(): Promise<SamtaleRow[]> {
  const sb = supabaseServer();
  const meg = await minId();
  if (!meg) return [];

  // RLS: kun samtaler jeg er deltager i kommer tilbage.
  const { data: convs } = await sb
    .from('conversations')
    .select(`id, last_message_at, deltagere:conversation_participants ( ${PART_SELECT} )`)
    .order('last_message_at', { ascending: false });
  if (!convs?.length) return [];

  // Seneste besked pr. samtale (separat query - robust, ingen embedded order/limit).
  const ids = convs.map((c: any) => c.id);
  const { data: msgs } = await sb
    .from('messages')
    .select('conversation_id, body, created_at, sender_id')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false });
  const sidsteMap = new Map<string, any>();
  for (const m of msgs ?? []) {
    if (!sidsteMap.has(m.conversation_id)) sidsteMap.set(m.conversation_id, m);
  }

  return (convs as any[]).map((c): SamtaleRow => {
    const deltagere = (c.deltagere ?? []) as any[];
    const mig = deltagere.find((d) => d.user_id === meg);
    const anden = deltagere.find((d) => d.user_id !== meg) ?? mig;
    const sidste = sidsteMap.get(c.id);
    const minLaest = mig?.last_read_at ? new Date(mig.last_read_at).getTime() : 0;
    const sidstMsg = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;
    return {
      id: c.id,
      andenPart: mapPart(anden),
      sidsteBesked: sidste?.body ?? null,
      sidsteTidspunkt: c.last_message_at,
      // Ulæst hvis der er kommet noget efter jeg sidst læste, og det ikke var mig selv.
      ulaest: sidstMsg > minLaest && sidste?.sender_id !== meg,
    };
  });
}

// En samtale med alle beskeder (ældste først) + hvem den anden part er + blok-status.
export async function getSamtale(convId: string): Promise<SamtaleDetalje | null> {
  const sb = supabaseServer();
  const meg = await minId();
  if (!meg) return null;

  // RLS: er man ikke deltager, kommer der ingen række tilbage.
  const { data: c } = await sb
    .from('conversations')
    .select(`id, deltagere:conversation_participants ( ${PART_SELECT} )`)
    .eq('id', convId)
    .maybeSingle();
  if (!c) return null;

  const deltagere = ((c as any).deltagere ?? []) as any[];
  const anden = deltagere.find((d) => d.user_id !== meg);
  if (!anden) return null;
  const andenPart = mapPart(anden);

  const [{ data: rawMsgs }, { data: blok }] = await Promise.all([
    sb
      .from('messages')
      .select('id, body, sender_id, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true }),
    sb
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', meg)
      .eq('blocked_id', andenPart.id)
      .maybeSingle(),
  ]);

  const beskeder: Besked[] = (rawMsgs ?? []).map((m: any) => ({
    id: m.id,
    body: m.body,
    senderId: m.sender_id ?? null,
    createdAt: m.created_at,
  }));

  return { id: (c as any).id, andenPart, beskeder, jegHarBlokeret: !!blok };
}

// Antal samtaler med ulæst (til evt. nav-badge; billig nok).
export async function getUlaesteSamtaler(): Promise<number> {
  return (await getSamtaler()).filter((s) => s.ulaest).length;
}
