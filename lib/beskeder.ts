import { supabaseServer } from '@/lib/supabase/server';
import { beskedBilledeUrl } from '@/lib/billeder';
import type { SamtaleRow, SamtaleDetalje, AndenPart, Besked } from '@/lib/types';

// Embed af en deltagers profil + bil (garage-badge), samme FK-hints som forum.
const PART_SELECT = `user_id, last_read_at, hidden_at,
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

  const rows: SamtaleRow[] = [];
  for (const c of convs as any[]) {
    const deltagere = (c.deltagere ?? []) as any[];
    const mig = deltagere.find((d) => d.user_id === meg);
    const anden = deltagere.find((d) => d.user_id !== meg) ?? mig;
    const sidste = sidsteMap.get(c.id);
    const minLaest = mig?.last_read_at ? new Date(mig.last_read_at).getTime() : 0;
    const sidstMsg = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;

    // Skjul-for-mig (P15): har jeg skjult samtalen og er der intet nyt siden,
    // så udelad den. Ny besked bumper last_message_at > hidden_at -> dukker op igen.
    const skjultTid = mig?.hidden_at ? new Date(mig.hidden_at).getTime() : 0;
    if (skjultTid && sidstMsg <= skjultTid) continue;

    rows.push({
      id: c.id,
      andenPart: mapPart(anden),
      // Kun-billede-beskeder har tom body -> vis en billed-markoer i stedet.
      sidsteBesked: sidste ? (sidste.body?.trim() ? sidste.body : '📷 Billede') : null,
      sidsteTidspunkt: c.last_message_at,
      // Ulæst hvis der er kommet noget efter jeg sidst læste, og det ikke var mig selv.
      ulaest: sidstMsg > minLaest && sidste?.sender_id !== meg,
    });
  }
  return rows;
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

  // Vedhaeftede billeder pr. besked (P10). RLS (message_images_read) giver kun
  // raekker tilbage i samtaler jeg er deltager i - samme ramme som beskederne.
  const msgIds = (rawMsgs ?? []).map((m: any) => m.id);
  const billedMap = new Map<string, string[]>();
  if (msgIds.length) {
    const { data: imgs } = await sb
      .from('message_images')
      .select('message_id, path, display_order')
      .in('message_id', msgIds)
      .order('display_order', { ascending: true });
    for (const i of (imgs ?? []) as any[]) {
      const arr = billedMap.get(i.message_id) ?? [];
      arr.push(beskedBilledeUrl(i.path));
      billedMap.set(i.message_id, arr);
    }
  }

  const beskeder: Besked[] = (rawMsgs ?? []).map((m: any) => ({
    id: m.id,
    body: m.body,
    senderId: m.sender_id ?? null,
    createdAt: m.created_at,
    billeder: billedMap.get(m.id) ?? [],
  }));

  return { id: (c as any).id, andenPart, beskeder, jegHarBlokeret: !!blok };
}

// Antal samtaler med ulæst (til evt. nav-badge; billig nok).
export async function getUlaesteSamtaler(): Promise<number> {
  return (await getSamtaler()).filter((s) => s.ulaest).length;
}

// Søg brugere på visningsnavn (til "Ny besked"-compose - direkte mellem
// brugere uden at gå via et oplæg). Profiler er offentligt læsbare
// (profiles_read_all), så ingen RPC/migration nødvendig. Ekskluderer mig selv
// og brugere jeg har blokeret eller er blokeret af (begge veje), så en
// blokeret bruger ikke dukker op som ny modtager.
export async function soegBrugere(q: string): Promise<AndenPart[]> {
  const sb = supabaseServer();
  const meg = await minId();
  if (!meg) return [];

  // Rens input: fjern PostgREST-wildcards/metategn så søgningen er et rent
  // delstrengs-match (ingen injektion i ilike-mønstret).
  const term = q.trim().replace(/[%,()*\\]/g, ' ').trim();
  if (term.length < 2) return [];

  const udeluk = new Set<string>([meg]);
  const { data: blocks } = await sb
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${meg},blocked_id.eq.${meg}`);
  for (const b of (blocks ?? []) as any[]) {
    udeluk.add(b.blocker_id === meg ? b.blocked_id : b.blocker_id);
  }

  const { data } = await sb
    .from('profiles')
    .select(
      `id, display_name,
       bil:models!profiles_car_model_id_fkey ( name ),
       variant:variants!profiles_car_variant_id_fkey ( name )`,
    )
    .not('display_name', 'is', null)
    .ilike('display_name', `%${term}%`)
    .order('display_name', { ascending: true })
    .limit(25);

  return ((data ?? []) as any[])
    .filter((p) => !udeluk.has(p.id))
    .slice(0, 10)
    .map((p): AndenPart => {
      const modelNavn = p.bil?.name ?? null;
      const variantNavn = p.variant?.name ?? null;
      const bil = modelNavn ? (variantNavn ? `${modelNavn} · ${variantNavn}` : modelNavn) : null;
      return { id: p.id, navn: p.display_name ?? null, bil };
    });
}
