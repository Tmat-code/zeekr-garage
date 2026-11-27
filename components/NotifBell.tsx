'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { relativTid } from '@/lib/i18n/format';
import type { Notifikation } from '@/lib/types';

// Facebook-agtig klokke: ulaest-badge + dropdown. Supabase Realtime -> badgen
// opdaterer live uden refresh. SSR giver start-tallet (ingen tom-blink).
type Props = { userId: string; initialUnread: number };

// Samme navn som i NotifikationerListe - /notifikationer-siden fyrer dette
// window-event naar den sletter/markerer laest, saa klokken opfriskes med (de
// to komponenter deler ingen state, og realtime her lytter kun paa INSERT).
const NOTIF_EVENT = 'notifikationer:aendret';

// Lille type-ikon foran teksten, saa en notifikation er genkendelig paa ét blik.
// Ukendte typer falder tilbage til en neutral prik (ingen "tom" raekke).
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
    case 'kontakt':
      return '📨';
    case 'ota':
      return '📦';
    default:
      return '🔔';
  }
}

// Officielle moderings-notifikationer skal ikke forveksles med en ligeværdig
// besked -> egen kobber-accent-stribe i venstre kant.
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

export default function NotifBell({ userId, initialUnread }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Notifikation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const rodRef = useRef<HTMLDivElement>(null);

  // --- Realtime: nye notifikationer for netop denne bruger ---
  // VIGTIGT: realtime SKAL autentificere med brugerens JWT (setAuth), ellers
  // evalueres RLS (modtager_id = auth.uid()) med auth.uid() = null for anon ->
  // alle rækker filtreres væk, og klienten får ingen postgres_changes-events.
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
        .channel(`notif:${userId}`)
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
            setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 15));
            if (!n.erLaest) setUnread((u) => u + 1);
          },
        )
        .subscribe();
    })();

    // Hold realtime-token frisk når sessionen fornyes.
    const { data: authSub } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) sb.realtime.setAuth(session.access_token);
    });

    return () => {
      aktiv = false;
      authSub.subscription.unsubscribe();
      if (kanal) sb.removeChannel(kanal);
    };
  }, [userId]);

  // --- Hent listen (ved foerste aabning + genopfrisk badge mod serveren) ---
  const hent = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data }, { count }] = await Promise.all([
      sb
        .from('notifications')
        .select('id, type, tekst, href, er_laest, created_at')
        .eq('modtager_id', userId)
        .order('created_at', { ascending: false })
        .limit(15),
      sb
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('modtager_id', userId)
        .eq('er_laest', false),
    ]);
    setItems((data ?? []).map(mapRow));
    setUnread(count ?? 0);
    setLoaded(true);
  }, [userId]);

  // --- Sikkerhedsnet: opfrisk når fanen bliver aktiv igen (hvis realtime missede noget) ---
  useEffect(() => {
    const opfrisk = () => {
      if (document.visibilityState === 'visible') void hent();
    };
    document.addEventListener('visibilitychange', opfrisk);
    window.addEventListener('focus', opfrisk);
    return () => {
      document.removeEventListener('visibilitychange', opfrisk);
      window.removeEventListener('focus', opfrisk);
    };
  }, [hent]);

  // --- Foelg med naar /notifikationer-siden sletter/markerer laest ---
  useEffect(() => {
    const paaAendret = () => void hent();
    window.addEventListener(NOTIF_EVENT, paaAendret);
    return () => window.removeEventListener(NOTIF_EVENT, paaAendret);
  }, [hent]);

  // --- Luk ved klik udenfor + Escape ---
  useEffect(() => {
    if (!open) return;
    const udenfor = (e: MouseEvent) => {
      if (rodRef.current && !rodRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', udenfor);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', udenfor);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  function toggle() {
    const naesteOpen = !open;
    setOpen(naesteOpen);
    if (naesteOpen) void hent(); // altid frisk ved aabning
  }

  async function aabnNotif(n: Notifikation) {
    setOpen(false);
    if (!n.erLaest) {
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, erLaest: true } : p)));
      setUnread((u) => Math.max(0, u - 1));
      try {
        await supabaseBrowser().from('notifications').update({ er_laest: true }).eq('id', n.id);
      } catch {
        /* best-effort - navigationen er vigtigere end markeringen */
      }
    }
    router.push(n.href);
  }

  async function markerAlle() {
    setItems((prev) => prev.map((p) => ({ ...p, erLaest: true })));
    setUnread(0);
    try {
      await supabaseBrowser()
        .from('notifications')
        .update({ er_laest: true })
        .eq('modtager_id', userId)
        .eq('er_laest', false);
    } catch {
      /* best-effort */
    }
  }

  const badge = unread > 9 ? '9+' : String(unread);

  return (
    <div ref={rodRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifikationer (${unread} ulæste)` : 'Notifikationer'}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-grafit-600 hover:bg-grafit-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.05rem] items-center justify-center rounded-full bg-kobber-600 px-1 text-[10px] font-bold leading-4 text-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-grafit-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-grafit-100 px-3 py-2">
            <span className="text-sm font-semibold text-grafit-800">Notifikationer</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markerAlle}
                className="text-xs text-kobber-700 hover:underline"
              >
                Markér alle læst
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {!loaded ? (
              <p className="px-3 py-6 text-center text-sm text-grafit-400">Henter …</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-grafit-400">
                Ingen notifikationer endnu.
              </p>
            ) : (
              <ul className="divide-y divide-grafit-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => aabnNotif(n)}
                      className={`flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-grafit-50 ${
                        n.erLaest ? '' : 'bg-kobber-50/60'
                      } ${erOfficiel(n.type) ? 'border-l-2 border-kobber-500' : ''}`}
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
                        <span className="mt-0.5 block text-xs text-grafit-400">
                          {relativTid(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-grafit-100 px-3 py-2 text-center">
            <Link
              href="/notifikationer"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-kobber-700 hover:underline"
            >
              Se alle
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
