'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import type { ForumIndlaeg } from '@/lib/types';
import GarageBadge from '@/components/forum/GarageBadge';
import { svar, retIndlaeg, fjernIndlaeg } from '@/app/forum/actions';

function IndlaegKort({
  p,
  kategoriSlug,
  traadSlug,
  megId,
  erModerator,
  koer,
  pending,
}: {
  p: ForumIndlaeg;
  kategoriSlug: string;
  traadSlug: string;
  megId: string | null;
  erModerator: boolean;
  koer: (fn: () => Promise<void>) => void;
  pending: boolean;
}) {
  const [redigerer, setRedigerer] = useState(false);
  const [tekst, setTekst] = useState(p.body);
  const minEgen = !!megId && p.authorId === megId;
  const kanRette = minEgen || erModerator;
  // Åbnings-indlægget fjernes ikke her (brug "Fjern tråd" i moderering).
  const kanFjerne = kanRette && !p.isOpening;

  return (
    <div
      className={`rounded-xl border p-4 ${
        p.isOpening ? 'border-grafit-200 bg-white' : 'border-grafit-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-grafit-900">{p.forfatter || 'Ejer'}</span>
        <GarageBadge bil={p.bil} />
        <span className="text-xs text-grafit-400">
          {relativTid(p.createdAt)}
          {p.edited && ' · redigeret'}
        </span>
      </div>

      {redigerer ? (
        <div className="mt-2 space-y-2">
          <textarea
            className="input min-h-[100px]"
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className="btn-primary !py-1.5 text-sm"
              disabled={pending || !tekst.trim()}
              onClick={() =>
                koer(async () => {
                  await retIndlaeg(p.id, kategoriSlug, traadSlug, tekst);
                  setRedigerer(false);
                })
              }
            >
              Gem
            </button>
            <button
              className="btn-ghost !py-1.5 text-sm"
              onClick={() => {
                setTekst(p.body);
                setRedigerer(false);
              }}
            >
              Annullér
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-line text-grafit-800">{p.body}</p>
      )}

      {!redigerer && kanRette && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <button
            className="text-grafit-500 hover:text-kobber-700"
            onClick={() => setRedigerer(true)}
          >
            ✏️ Ret
          </button>
          {kanFjerne && (
            <button
              className="text-grafit-500 hover:text-kobber-700"
              disabled={pending}
              onClick={() => {
                if (confirm('Fjern dette indlæg?')) {
                  koer(() => fjernIndlaeg(p.id, kategoriSlug, traadSlug));
                }
              }}
            >
              🗑 Fjern
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ForumTraad({
  threadId,
  kategoriSlug,
  traadSlug,
  indlaeg,
  megId,
  erModerator,
  isLoggedIn,
  isLocked,
  naeste,
}: {
  threadId: string;
  kategoriSlug: string;
  traadSlug: string;
  indlaeg: ForumIndlaeg[];
  megId: string | null;
  erModerator: boolean;
  isLoggedIn: boolean;
  isLocked: boolean;
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
    koer(async () => {
      await svar(threadId, kategoriSlug, traadSlug, ny);
      setNy('');
    });
  }

  const antalSvar = Math.max(0, indlaeg.filter((p) => !p.isOpening).length);

  return (
    <div className="mt-6">
      <div className="space-y-3">
        {indlaeg.map((p) => (
          <IndlaegKort
            key={p.id}
            p={p}
            kategoriSlug={kategoriSlug}
            traadSlug={traadSlug}
            megId={megId}
            erModerator={erModerator}
            koer={koer}
            pending={pending}
          />
        ))}
      </div>

      {/* Svar-felt */}
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-grafit-700">
          {antalSvar === 0 ? 'Vær den første der svarer' : `Svar (${antalSvar})`}
        </h2>
        {isLocked ? (
          <div className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-500">
            🔒 Tråden er låst - der kan ikke skrives flere svar.
          </div>
        ) : isLoggedIn ? (
          <div className="space-y-2">
            <textarea
              className="input min-h-[100px]"
              value={ny}
              onChange={(e) => setNy(e.target.value)}
              placeholder="Skriv et svar…"
            />
            <div className="flex items-center gap-3">
              <button
                className="btn-primary !py-2 text-sm"
                disabled={pending || !ny.trim()}
                onClick={send}
              >
                Send svar
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
            for at svare.
          </div>
        )}
      </div>
    </div>
  );
}
