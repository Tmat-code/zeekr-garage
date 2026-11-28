import { supabaseServer } from '@/lib/supabase/server';
import { beskedBilledeUrl, avatarUrl } from '@/lib/billeder';
import { hentOrdbog } from '@/lib/i18n/server';
import type { SamtaleRow, SamtaleDetalje, AndenPart, Deltager, Besked } from '@/lib/types';

// Embed af en deltagers profil + bil (garage-badge), samme FK-hints som forum.
const PART_SELECT = `user_id, last_read_at, hidden_at,
  profil:profiles!conversation_participants_user_id_fkey (
    display_name,
    avatar_path,
    bil:models!profiles_car_model_id_fkey ( name ),
    variant:variants!profiles_car_variant_id_fkey ( name )
  )`;

// conversations-select med gruppe-felterne (P12).
const CONV_SELECT = `id, last_message_at, is_group, title, created_by,
  deltagere:conversation_participants ( ${PART_SELECT} )`;

function partBil(pr: any): string | null {
  const modelNavn = pr?.bil?.name ?? null;
  const variantNavn = pr?.variant?.name ?? null;
  return modelNavn ? (variantNavn ? `${modelNavn} · ${variantNavn}` : modelNavn) : null;
}

function mapPart(p: any): AndenPart {
  const pr = p?.profil;
  return {
    id: p.user_id,
    navn: pr?.display_name ?? null,
    bil: partBil(pr),
    avatar: pr?.avatar_path ? avatarUrl(pr.avatar_path) : null,
  };
}

// Afled en visnings-label for en gruppe: eksplicit navn vinder, ellers
// deltagernes navne ("Anna, Bo, Carl" / "Anna, Bo +2").
// `udenNavne` = ordbogens "Gruppe" på læserens sprog (U5).
function gruppeLabel(
  titel: string | null | undefined,
  navne: (string | null)[],
  udenNavne: string,
): string {
  const t = (titel ?? '').trim();
  if (t) return t;
  const n = navne.map((x) => (x ?? '').trim()).filter(Boolean);
  if (n.length === 0) return udenNavne;
  if (n.length <= 3) return n.join(', ');
  return `${n.slice(0, 2).join(', ')} +${n.length - 2}`;
}

async function minId(): Promise<string | null> {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user?.id ?? null;
}

// Indbakke: mine samtaler, nyeste øverst, med modpart/gruppe-label + seneste besked + ulæst.
export async function getSamtaler(): Promise<SamtaleRow[]> {
  const sb = supabaseServer();
  const meg = await minId();
  if (!meg) return [];
  const t = (await hentOrdbog()).beskeder;

  // RLS: kun samtaler jeg er deltager i kommer tilbage.
  const { data: convs } = await sb
    .from('conversations')
    .select(CONV_SELECT)
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
    const andre = deltagere.filter((d) => d.user_id !== meg);
    const sidste = sidsteMap.get(c.id);
    const minLaest = mig?.last_read_at ? new Date(mig.last_read_at).getTime() : 0;
    const sidstMsg = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;

    // Skjul-for-mig (P15): har jeg skjult samtalen og er der intet nyt siden,
    // så udelad den. Ny besked bumper last_message_at > hidden_at -> dukker op igen.
    const skjultTid = mig?.hidden_at ? new Date(mig.hidden_at).getTime() : 0;
    if (skjultTid && sidstMsg <= skjultTid) continue;

    const erGruppe = !!c.is_group;
    // 1:1: modparten (fallback mig selv hvis alene). Gruppe: ingen enkelt modpart.
    const anden = erGruppe ? null : mapPart(andre[0] ?? mig);
    const titel = erGruppe
      ? gruppeLabel(c.title, andre.map((d) => d.profil?.display_name ?? null), t.gruppe)
      : (anden?.navn ?? t.ejer);

    rows.push({
      id: c.id,
      erGruppe,
      andenPart: anden,
      titel,
      antalDeltagere: deltagere.length,
      // Kun-billede-beskeder har tom body -> vis en billed-markoer i stedet.
      sidsteBesked: sidste ? (sidste.body?.trim() ? sidste.body : t.billedeMarkoer) : null,
      sidsteTidspunkt: c.last_message_at,
      // Ulæst hvis der er kommet noget efter jeg sidst læste, og det ikke var mig selv.
      ulaest: sidstMsg > minLaest && sidste?.sender_id !== meg,
    });
  }
  return rows;
}

// En samtale med alle beskeder (ældste først), deltagere, og 1:1-blok-status.
export async function getSamtale(convId: string): Promise<SamtaleDetalje | null> {
  const sb = supabaseServer();
  const meg = await minId();
  if (!meg) return null;

  // RLS: er man ikke deltager, kommer der ingen række tilbage.
  const { data: c } = await sb
    .from('conversations')
    .select(CONV_SELECT)
    .eq('id', convId)
    .maybeSingle();
  if (!c) return null;

  const erGruppe = !!(c as any).is_group;
  const alleRaw = (((c as any).deltagere ?? []) as any[]);
  const deltagere: Deltager[] = alleRaw.map(mapPart);
  const andreRaw = alleRaw.filter((d) => d.user_id !== meg);

  // 1:1: modparten skal findes (ellers en forældet/tom samtale -> notfound).
  // Gruppe: kan stå uden "modpart" (jeg kan være alene tilbage) - stadig gyldig.
  let andenPart: AndenPart | null = null;
  let jegHarBlokeret = false;
  if (!erGruppe) {
    const anden = andreRaw[0];
    if (!anden) return null;
    andenPart = mapPart(anden);
    const { data: blok } = await sb
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', meg)
      .eq('blocked_id', andenPart.id)
      .maybeSingle();
    jegHarBlokeret = !!blok;
  }

  const { data: rawMsgs } = await sb
    .from('messages')
    .select('id, body, sender_id, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });

  // Afsender-navn pr. besked (gruppe-visning). Byg et navne-map over ALLE
  // afsendere - inkl. folk der er forladt gruppen (de er ikke i deltager-listen,
  // men deres tidligere beskeder skal stadig vise et navn). Profiler er
  // offentligt læsbare, så ét opslag på de distinkte sender_id'er.
  const navnMap = new Map<string, string | null>();
  const avatarMap = new Map<string, string | null>();
  for (const d of deltagere) {
    navnMap.set(d.id, d.navn);
    avatarMap.set(d.id, d.avatar);
  }
  if (erGruppe) {
    const mangler = [
      ...new Set(
        (rawMsgs ?? [])
          .map((m: any) => m.sender_id)
          .filter((id: string | null): id is string => !!id && !navnMap.has(id)),
      ),
    ];
    if (mangler.length) {
      const { data: profs } = await sb
        .from('profiles')
        .select('id, display_name, avatar_path')
        .in('id', mangler);
      for (const p of (profs ?? []) as any[]) {
        navnMap.set(p.id, p.display_name ?? null);
        avatarMap.set(p.id, p.avatar_path ? avatarUrl(p.avatar_path) : null);
      }
    }
  }

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
    senderNavn: m.sender_id ? (navnMap.get(m.sender_id) ?? null) : null,
    senderAvatar: m.sender_id ? (avatarMap.get(m.sender_id) ?? null) : null,
    createdAt: m.created_at,
    billeder: billedMap.get(m.id) ?? [],
  }));

  const t = (await hentOrdbog()).beskeder;
  const titel = erGruppe
    ? gruppeLabel((c as any).title, andreRaw.map((d) => d.profil?.display_name ?? null), t.gruppe)
    : (andenPart?.navn ?? t.ejer);

  return {
    id: (c as any).id,
    erGruppe,
    titel,
    eksplicitTitel: ((c as any).title ?? null) || null,
    erOpretter: (c as any).created_by === meg,
    andenPart,
    deltagere,
    beskeder,
    jegHarBlokeret,
  };
}

// Antal samtaler med ulæst (til evt. nav-badge; billig nok).
export async function getUlaesteSamtaler(): Promise<number> {
  return (await getSamtaler()).filter((s) => s.ulaest).length;
}

// Ejere jeg har skrevet med (seneste distinkte 1:1-modparter) - til "Ny besked"
// så man kan samle en samtale/gruppe med et tryk uden at taste navne. Kun folk
// jeg allerede har kontakt med (privatlivs-sikkert), ekskl. blokerede. Grupper
// tælles ikke med (en gruppe har ingen entydig "modpart").
export async function senesteKontakter(graense = 8): Promise<AndenPart[]> {
  const sb = supabaseServer();
  const meg = await minId();
  if (!meg) return [];
  const t = (await hentOrdbog()).beskeder;

  const { data: convs } = await sb
    .from('conversations')
    .select(CONV_SELECT)
    .order('last_message_at', { ascending: false })
    .limit(40);
  if (!convs?.length) return [];

  const udeluk = new Set<string>([meg]);
  const { data: blocks } = await sb
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${meg},blocked_id.eq.${meg}`);
  for (const b of (blocks ?? []) as any[]) {
    udeluk.add(b.blocker_id === meg ? b.blocked_id : b.blocker_id);
  }

  const set = new Set<string>();
  const out: AndenPart[] = [];
  for (const c of convs as any[]) {
    if (c.is_group) continue; // kun 1:1 har en entydig modpart
    const anden = (c.deltagere ?? []).find((d: any) => d.user_id !== meg);
    if (!anden) continue;
    const p = mapPart(anden);
    if (udeluk.has(p.id) || set.has(p.id)) continue;
    set.add(p.id);
    out.push(p);
    if (out.length >= graense) break;
  }
  return out;
}

// Søg brugere på visningsnavn (til "Ny besked"-compose og gruppe-tilføj).
// Profiler er offentligt læsbare (profiles_read_all), så ingen RPC/migration
// nødvendig. Ekskluderer mig selv og brugere jeg har blokeret eller er
// blokeret af (begge veje), så en blokeret bruger ikke dukker op som modtager.
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
      `id, display_name, avatar_path,
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
    .map((p): AndenPart => ({
      id: p.id,
      navn: p.display_name ?? null,
      bil: partBil(p),
      avatar: p.avatar_path ? avatarUrl(p.avatar_path) : null,
    }));
}
