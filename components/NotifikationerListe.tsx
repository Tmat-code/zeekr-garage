'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { relativTid } from '@/lib/tid';
import type { Notifikation } from '@/lib/types';
import type { NotifikationSide } from '@/lib/notifikationer';

// Hele notifikations-listen med selv-administration (modsat klokke-dropdownen,
// der kun viser de 15 nyeste). Viser BAADE laeste og ulaeste - en laest notif er
// stadig en genvej tilbage til traaden, saa den skjules ikke - men brugeren kan
// holde listen kort via slet pr. notif + "Ryd læste" + "Markér alle læst".
// Henter via browser-klienten (RLS: ejer laeser/opdaterer/sletter kun egne),
// pagineret med range + exact count (samme afkortnings-vej som P16/P20/P24).

const SIDE = 20;

// Samme navn skal bruges i NotifBell - et lille window-event, saa klokkens
// badge/liste foelger med naar man sletter/markerer laest her paa siden (de to
// komponenter deler ingen state, og klokkens realtime lytter kun paa INSERT).
const NOTIF_EVENT = 'notifikationer:aendret';

function ikonFor(type: string): string {
  switch (type) {
    case 'nyt_event':
      return '📅';
    case 'forum_svar':
      return '💬';
    case 'pb_besked':
      return '✉️';
    case 'mention':
      return '@';
    case 'moderation':
    case 'advarsel':
      return '🛡';
    case 'forum_rapport':
      return '🚩';
    case 'ota':
      return '📦';
    default:
      return '🔔';
  }
}

function erOfficiel(type: string): boolean {
  return type === 'moderation' || type === 'advarsel';
}

function mapRow(r: any): Notifikation {
  return {
    id: r.id,
    type: r.type,
    tekst: r.tekst,
    href: r.href,
    erLaest: r.er_laest ?? false,
    createdAt: r.created_at,
  };
}

type Props = { userId: string; initial: NotifikationSide };

export default function NotifikationerListe({ userId, initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Notifikation[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [ulaest, setUlaest] = useState(initial.ulaest);
  const [henter, setHenter] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  // Fortael klokken (og evt. andre faner-instanser) at noget aendrede sig, saa
  // dens badge/liste opfriskes. Best-effort.
  function pingKlokke() {
    try {
      window.dispatchEvent(new CustomEvent(NOTIF_EVENT));
    } catch {
      /* ingen window (SSR) - ligegyldigt */
    }
  }

  // --- Hent en side. reset=true: forfra (offset 0). reset=false: "vis flere". ---
  const hentSide = useCallback(
    async (reset: boolean) => {
      setFejl(null);
      setHenter(true);
      try {
        const sb = supabaseBrowser();
        const fra = reset ? 0 : items.length;
        const [{ data, count, error }, { count: ulaestCount }] = await Promise.all([
          sb
            .from('notifications')
            .select('id, type, tekst, href, er_laest, created_at', { count: 'exact' })
            .eq('modtager_id', userId)
            .order('created_at', { ascending: false })
            .range(fra, fra + SIDE - 1),
          sb
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('modtager_id', userId)
            .eq('er_laest', false),
        ]);
        if (error) throw error;
        const nye = (data ?? []).map(mapRow);
        setItems((cur) => {
          if (reset) return nye;
          // Dedup paa id - en realtime-INSERT kan have lagt en raekke ind imens.
          const set = new Set(cur.map((n) => n.id));
          return [...cur, ...nye.filter((n) => !set.has(n.id))];
        });
        setTotal(count ?? 0);
        setUlaest(ulaestCount ?? 0);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke hente notifikationer.');
      } finally {
        setHenter(false);
      }
    },
    [items.length, userId],
  );

  // --- Realtime: nye notifikationer for netop denne bruger dukker op live ---
  // (samme mekanik + JWT-krav som NotifBell).
  useEffect(() => {
    const sb = supabaseBrowser();
    let kanal: ReturnType<typeof sb.channel> | null = null;
    let aktiv = true;

    (async () => {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!aktiv) return;
      if (session?.access_token) sb.realtime.setAuth(session.access_token);

      kanal = sb
        .channel(`notif-side:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `modtager_id=eq.${userId}`,
          },
          (payload) => {
            const n = mapRow(payload.new);
            setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
            setTotal((t) => t + 1);
            if (!n.erLaest) setUlaest((u) => u + 1);
          },
        )
        .subscribe();
    })();

    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) sb.realtime.setAuth(session.access_token);
    });

    return () => {
      aktiv = false;
      authSub.subscription.unsubscribe();
      if (kanal) sb.removeChannel(kanal);
    };
  }, [userId]);

  // --- Aabn: markér laest (optimistisk) + naviger (baerer P34-deep-linket #post-<id>) ---
  async function aabn(n: Notifikation) {
    if (!n.erLaest) {
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, erLaest: true } : p)));
      setUlaest((u) => Math.max(0, u - 1));
      try {
        await supabaseBrowser().from('notifications').update({ er_laest: true }).eq('id', n.id);
        pingKlokke();
      } catch {
        /* best-effort - navigationen er vigtigere end markeringen */
      }
    }
    router.push(n.href);
  }

  // --- Slet én notifikation ---
  async function slet(n: Notifikation) {
    const varUlaest = !n.erLaest;
    setItems((prev) => prev.filter((p) => p.id !== n.id));
    setTotal((t) => Math.max(0, t - 1));
    if (varUlaest) setUlaest((u) => Math.max(0, u - 1));
    try {
      const { error } = await supabaseBrowser().from('notifications').delete().eq('id', n.id);
      if (error) throw error;
      pingKlokke();
    } catch (e: any) {
      setFejl('Kunne ikke slette - prøv igen.');
      void hentSide(true); // bring listen i sync igen
    }
  }

  // --- Markér alle laest ---
  async function markerAlle() {
    setItems((prev) => prev.map((p) => ({ ...p, erLaest: true })));
    setUlaest(0);
    try {
      await supabaseBrowser()
        .from('notifications')
        .update({ er_laest: true })
        .eq('modtager_id', userId)
        .eq('er_laest', false);
      pingKlokke();
    } catch {
      void hentSide(true);
    }
  }

  // --- Ryd alle laeste (ogsaa dem der ikke er hentet endnu) -> hent forfra ---
  async function rydLaeste() {
    setFejl(null);
    try {
      const { error } = await supabaseBrowser()
        .from('notifications')
        .delete()
        .eq('modtager_id', userId)
        .eq('er_laest', true);
      if (error) throw error;
      pingKlokke();
    } catch (e: any) {
      setFejl('Kunne ikke rydde de læste - prøv igen.');
    }
    await hentSide(true);
  }

  const harLaeste = total - ulaest > 0;

  return (
    <div>
      {/* Handlinger */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-grafit-500">
          {total === 0 ? 'Ingen notifikationer' : `viser ${items.length} af ${total}`}
          {ulaest > 0 && ` · ${ulaest} ulæst`}
        </span>
        <span className="flex-1" />
        {ulaest > 0 && (
          <button type="button" onClick={markerAlle} className="btn-ghost !py-1.5 text-sm">
            Markér alle læst
          </button>
        )}
        {harLaeste && (
          <button type="button" onClick={rydLaeste} className="btn-ghost !py-1.5 text-sm">
            Ryd læste
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-grafit-200 bg-white px-4 py-10 text-center text-sm text-grafit-400">
          Du har ingen notifikationer endnu.
        </p>
      ) : (
        <ul className="divide-y divide-grafit-100 overflow-hidden rounded-xl border border-grafit-200 bg-white">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-2 ${n.erLaest ? '' : 'bg-kobber-50/60'} ${
                erOfficiel(n.type) ? 'border-l-2 border-kobber-500' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => aabn(n)}
                className="flex min-w-0 flex-1 items-start gap-2.5 px-3 py-3 text-left hover:bg-grafit-50"
              >
                <span
                  className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                    n.erLaest ? 'bg-transparent' : 'bg-kobber-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden="true">
                  {ikonFor(n.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-grafit-800">{n.tekst}</span>
                  <span className="mt-0.5 block text-xs text-grafit-400">{relativTid(n.createdAt)}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => slet(n)}
                aria-label="Slet notifikation"
                title="Slet"
                className="mt-2 mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-grafit-400 hover:bg-grafit-100 hover:text-kobber-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <button className="btn-ghost mt-4 !py-1.5 text-sm" disabled={henter} onClick={() => hentSide(false)}>
          {henter ? 'Henter …' : 'Vis flere'}
        </button>
      )}

      {fejl && <p className="mt-3 text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
