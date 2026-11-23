'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { relativTid } from '@/lib/tid';
import type { AndenPart, Besked } from '@/lib/types';
import GarageBadge from '@/components/forum/GarageBadge';
import BilledeUpload from '@/components/forum/BilledeUpload';
import BilledeGalleri from '@/components/BilledeGalleri';
import { BESKED_BUCKET, beskedBilledeUrl } from '@/lib/billeder';
import {
  sendBesked,
  markLaest,
  blokerBruger,
  fjernBlok,
  anmeldBesked,
  sletSamtale,
} from '@/app/beskeder/actions';

type Props = {
  convId: string;
  megId: string;
  andenPart: AndenPart;
  initialBeskeder: Besked[];
  initialBlokeret: boolean;
};

function mapRow(r: any): Besked {
  // Realtime-payloaden baerer ikke billeder (de indsaettes i en separat raekke
  // lige efter beskeden) - de hentes bagefter i hentOgSaetBilleder.
  return {
    id: r.id,
    body: r.body,
    senderId: r.sender_id ?? null,
    createdAt: r.created_at,
    billeder: [],
  };
}

export default function SamtaleView({
  convId,
  megId,
  andenPart,
  initialBeskeder,
  initialBlokeret,
}: Props) {
  const [beskeder, setBeskeder] = useState<Besked[]>(initialBeskeder);
  const [ny, setNy] = useState('');
  const [nyeBilleder, setNyeBilleder] = useState<string[]>([]);
  const [uploadKey, setUploadKey] = useState(0); // remount => ryd upload-preview
  const [blokeret, setBlokeret] = useState(initialBlokeret);
  const [fejl, setFejl] = useState<string | null>(null);
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const [pending, start] = useTransition();
  const bundRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Hent en beskeds billeder (RLS: kun deltagere) og saet dem paa beskeden.
  // Billed-raekkerne indsaettes lige EFTER selve beskeden, saa realtime-ekkoet
  // kan naa frem foer de er committet - derfor ét retry hvis foerste kald er tomt.
  // Patcher kun ved fund, saa en ren tekst-besked ikke faar sine (evt. optimistiske) billeder nulstillet.
  async function hentOgSaetBilleder(id: string) {
    const sb = supabaseBrowser();
    for (let forsoeg = 0; forsoeg < 2; forsoeg++) {
      const { data } = await sb
        .from('message_images')
        .select('path, display_order')
        .eq('message_id', id)
        .order('display_order', { ascending: true });
      if (data && data.length) {
        const urls = (data as any[]).map((r) => beskedBilledeUrl(r.path));
        setBeskeder((prev) => prev.map((x) => (x.id === id ? { ...x, billeder: urls } : x)));
        return;
      }
      if (forsoeg === 0) await new Promise((r) => setTimeout(r, 600));
    }
  }

  // Markér læst ved åbning.
  useEffect(() => {
    void markLaest(convId);
  }, [convId]);

  // Realtime: nye beskeder i denne samtale (JWT-auth, ellers filtrerer RLS alt væk).
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
        .channel(`samtale:${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convId}`,
          },
          (payload) => {
            const m = mapRow(payload.new);
            setBeskeder((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m],
            );
            if (m.senderId !== megId) void markLaest(convId);
            // Hent evt. vedhæftede billeder (egne beskeder har dem allerede
            // optimistisk, men hentning er idempotent og patcher kun ved fund).
            void hentOgSaetBilleder(m.id);
          },
        )
        .subscribe();
    })();
    return () => {
      aktiv = false;
      if (kanal) sb.removeChannel(kanal);
    };
  }, [convId, megId]);

  // Rul til nyeste.
  useEffect(() => {
    bundRef.current?.scrollIntoView({ block: 'end' });
  }, [beskeder.length]);

  function send() {
    const b = ny.trim();
    const paths = nyeBilleder;
    if (!b && paths.length === 0) return;
    setFejl(null);
    start(async () => {
      try {
        const id = await sendBesked(convId, b, paths);
        // Optimistisk: vis straks (med egne billeder). Realtime-ekkoet dedupes
        // på id, så beskeden ikke dubleres.
        setBeskeder((prev) =>
          prev.some((x) => x.id === id)
            ? prev
            : [
                ...prev,
                {
                  id,
                  body: b,
                  senderId: megId,
                  createdAt: new Date().toISOString(),
                  billeder: paths.map(beskedBilledeUrl),
                },
              ],
        );
        setNy('');
        setNyeBilleder([]);
        setUploadKey((k) => k + 1); // ryd upload-preview (uden at slette de nu-koblede filer)
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke sende.');
      }
    });
  }

  function skiftBlok() {
    setFejl(null);
    start(async () => {
      try {
        if (blokeret) {
          await fjernBlok(convId, andenPart.id);
          setBlokeret(false);
        } else {
          await blokerBruger(convId, andenPart.id);
          setBlokeret(true);
        }
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  function slet() {
    setFejl(null);
    start(async () => {
      try {
        await sletSamtale(convId);
        router.push('/beskeder');
        router.refresh();
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke slette samtalen.');
        setBekraeftSlet(false);
      }
    });
  }

  function anmeld() {
    const grund = window.prompt('Hvorfor anmelder du denne samtale? (valgfrit)') ?? '';
    const sidste = beskeder[beskeder.length - 1];
    start(async () => {
      try {
        await anmeldBesked(convId, sidste?.id ?? null, grund);
        setFejl('Tak - samtalen er anmeldt til moderatorerne.');
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke anmelde.');
      }
    });
  }

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grafit-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-grafit-900">{andenPart.navn || 'Ejer'}</span>
          <GarageBadge bil={andenPart.bil} />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button
            className="text-grafit-500 hover:text-kobber-700"
            disabled={pending}
            onClick={anmeld}
          >
            Anmeld
          </button>
          <button
            className="text-grafit-500 hover:text-kobber-700"
            disabled={pending}
            onClick={skiftBlok}
          >
            {blokeret ? 'Fjern blokering' : 'Blokér'}
          </button>
          {bekraeftSlet ? (
            <span className="flex items-center gap-2">
              <button
                className="font-medium text-kobber-700 hover:text-kobber-800"
                disabled={pending}
                onClick={slet}
              >
                Slet samtale?
              </button>
              <button
                className="text-grafit-400 hover:text-grafit-600"
                disabled={pending}
                onClick={() => setBekraeftSlet(false)}
              >
                Fortryd
              </button>
            </span>
          ) : (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => setBekraeftSlet(true)}
            >
              Slet
            </button>
          )}
        </div>
      </div>

      {/* Beskeder */}
      <div className="min-h-[240px] space-y-2 py-4">
        {beskeder.length === 0 ? (
          <p className="py-10 text-center text-sm text-grafit-400">
            Ingen beskeder endnu. Skriv den første.
          </p>
        ) : (
          beskeder.map((m) => {
            const min = m.senderId === megId;
            const harTekst = !!m.body?.trim();
            return (
              <div key={m.id} className={`flex ${min ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] space-y-1">
                  {harTekst && (
                    <div
                      className={`whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                        min
                          ? 'rounded-br-sm bg-kobber-500 text-white'
                          : 'rounded-bl-sm bg-grafit-100 text-grafit-800'
                      }`}
                    >
                      {m.body}
                    </div>
                  )}
                  {m.billeder.length > 0 && (
                    <div className={min ? 'flex justify-end' : 'flex justify-start'}>
                      <BilledeGalleri billeder={m.billeder} alt="Besked-billede" />
                    </div>
                  )}
                  <div
                    className={`mt-0.5 text-[11px] text-grafit-400 ${min ? 'text-right' : 'text-left'}`}
                  >
                    {relativTid(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bundRef} />
      </div>

      {/* Composer */}
      {blokeret ? (
        <div className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-600">
          Du har blokeret denne bruger. Fjern blokeringen for at skrive igen.
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="input min-h-[72px]"
            value={ny}
            onChange={(e) => setNy(e.target.value)}
            placeholder="Skriv en besked…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          {/* Billed-vedhæftning (P10). Privat bucket + privat URL-vej (ikke
              forum/meld's offentlige urlFor). accept="image/*" => mobil-kamera. */}
          <BilledeUpload
            key={uploadKey}
            bucket={BESKED_BUCKET}
            urlFor={beskedBilledeUrl}
            onChange={setNyeBilleder}
            disabled={pending}
          />
          <div className="flex items-center gap-3">
            <button
              className="btn-primary !py-2 text-sm"
              disabled={pending || (!ny.trim() && nyeBilleder.length === 0)}
              onClick={send}
            >
              Send
            </button>
            <span className="text-xs text-grafit-400">⌘/Ctrl + Enter sender</span>
          </div>
        </div>
      )}

      {fejl && <p className="mt-2 text-sm text-kobber-700">{fejl}</p>}
    </div>
  );
}
