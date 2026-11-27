'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { relativTid } from '@/lib/i18n/format';
import type { Kommentar } from '@/lib/types';
import Avatar from '@/components/forum/Avatar';
import {
  tilfoejKommentar,
  retKommentar,
  sletKommentar,
  markerLoesning,
} from '@/app/melding/actions';
import { startSamtaleMedBruger } from '@/app/beskeder/actions';

function KommentarKort({
  k,
  issueId,
  megId,
  erModerator,
  koer,
  pending,
}: {
  k: Kommentar;
  issueId: string;
  megId: string | null;
  erModerator: boolean;
  koer: (fn: () => Promise<void>) => void;
  pending: boolean;
}) {
  const router = useRouter();
  const [redigerer, setRedigerer] = useState(false);
  const [tekst, setTekst] = useState(k.body);
  const minEgen = !!megId && k.author_id === megId;
  const kanRette = minEgen || erModerator;
  // Skriv privat til en anden ejer direkte fra deres kommentar (ikke egne, kun indlogget).
  const kanSkrive = !!megId && !!k.author_id && k.author_id !== megId;

  return (
    <div
      className={`rounded-xl border p-4 ${
        k.is_solution ? 'border-l-4 border-l-[#4f6f4a] border-grafit-200 bg-grafit-50' : 'border-grafit-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar url={k.author_avatar} navn={k.author_navn} px={28} />
          <span className="font-medium text-grafit-900">{k.author_navn || 'Ejer'}</span>
        </div>
        <span className="text-xs text-grafit-400">{relativTid(k.created_at)}</span>
      </div>

      {k.is_solution && (
        <span className="mt-1 inline-block text-xs font-semibold" style={{ color: '#4f6f4a' }}>
          ✅ Markeret som løsning
        </span>
      )}

      {redigerer ? (
        <div className="mt-2 space-y-2">
          <textarea
            className="input min-h-[80px]"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn-primary !py-1.5 text-sm"
              disabled={pending}
              onClick={() =>
                koer(async () => {
                  await retKommentar(k.id, issueId, tekst);
                  setRedigerer(false);
                })
              }
            >
              Gem
            </button>
            <button
              className="btn-ghost !py-1.5 text-sm"
              onClick={() => {
                setTekst(k.body);
                setRedigerer(false);
              }}
            >
              Annullér
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1.5 whitespace-pre-line text-grafit-800">{k.body}</p>
      )}

      {!redigerer && (erModerator || kanRette || kanSkrive) && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {kanSkrive && (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() =>
                koer(async () => {
                  const convId = await startSamtaleMedBruger(k.author_id!);
                  router.push(`/beskeder/${convId}`);
                })
              }
            >
              ✉️ Skriv privat
            </button>
          )}
          {erModerator && (
            <button
              className="font-medium"
              style={{ color: '#4f6f4a' }}
              disabled={pending}
              onClick={() => koer(() => markerLoesning(k.id, issueId, !k.is_solution))}
            >
              {k.is_solution ? 'Fjern løsning' : '✅ Markér som løsning'}
            </button>
          )}
          {kanRette && (
            <>
              <button
                className="text-grafit-500 hover:text-kobber-700"
                onClick={() => setRedigerer(true)}
              >
                ✏️ Ret
              </button>
              <button
                className="text-grafit-500 hover:text-kobber-700"
                disabled={pending}
                onClick={() => {
                  if (confirm('Slet denne kommentar?')) {
                    koer(() => sletKommentar(k.id, issueId));
                  }
                }}
              >
                🗑 Slet
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Kommentarer({
  issueId,
  kommentarer,
  megId,
  erModerator,
  isLoggedIn,
  naeste,
}: {
  issueId: string;
  kommentarer: Kommentar[];
  megId: string | null;
  erModerator: boolean;
  isLoggedIn: boolean;
  naeste: string;
}) {
  const [ny, setNy] = useState('');
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  }

  function send() {
    setFejl(null);
    start(async () => {
      try {
        await tilfoejKommentar(issueId, ny);
        setNy('');
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke sende.');
      }
    });
  }

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-grafit-900">
        💬 Byggemøde ({kommentarer.length})
      </h2>
      <p className="mt-0.5 text-sm text-grafit-500">
        Er det en betjeningsfejl, eller har du et fix? Hjælp de andre her - så fanges en fejl 40,
        før den ryger i rapporten til Zeekr.
      </p>

      <div className="mt-4 space-y-3">
        {kommentarer.length === 0 ? (
          <p className="text-sm text-grafit-500">Ingen kommentarer endnu. Vær den første.</p>
        ) : (
          kommentarer.map((k) => (
            <KommentarKort
              key={k.id}
              k={k}
              issueId={issueId}
              megId={megId}
              erModerator={erModerator}
              koer={koer}
              pending={pending}
            />
          ))
        )}
      </div>

      {/* Skrivefelt */}
      <div className="mt-4">
        {isLoggedIn ? (
          <div className="space-y-2">
            <textarea
              className="input min-h-[90px]"
              value={ny}
              onChange={(e) => setNy(e.target.value)}
              placeholder="Fx: 'Dette er faktisk en indstilling - gå ind i menuen under…'"
            />
            <div className="flex items-center gap-3">
              <button
                className="btn-primary !py-2 text-sm"
                disabled={pending || !ny.trim()}
                onClick={send}
              >
                Send kommentar
              </button>
              {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-600">
            <Link
              href={`/login?naeste=${encodeURIComponent(naeste)}`}
              className="font-medium text-kobber-700 hover:underline"
            >
              Log ind
            </Link>{' '}
            for at kommentere.
          </div>
        )}
      </div>
    </section>
  );
}
