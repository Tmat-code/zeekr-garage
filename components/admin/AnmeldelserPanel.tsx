'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import type { BeskedAnmeldelse } from '@/lib/queries-admin';
import { saetAnmeldelseHaandteret, sletAnmeldtBesked } from '@/app/admin/beskeder-actions';

function useKoer() {
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const koer = (fn: () => Promise<void>) => {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? 'Noget gik galt.');
      }
    });
  };
  return { pending, fejl, koer };
}

function AnmeldelseKort({ a }: { a: BeskedAnmeldelse }) {
  const { pending, fejl, koer } = useKoer();
  const [bekraeftSlet, setBekraeftSlet] = useState(false);

  // Besked-tilstand: findes endnu / allerede slettet / anmeldelse uden besked.
  const beskedSlettet = a.messageId === null && !a.beskedBody;
  const harBesked = a.messageId !== null && a.beskedBody !== null;

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        a.handled ? 'border-grafit-200 opacity-70' : 'border-kobber-200'
      } ${pending ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {a.handled ? (
          <span className="chip bg-grafit-100 text-grafit-600">Håndteret</span>
        ) : (
          <span className="chip bg-kobber-100 text-kobber-800">Ny</span>
        )}
        <span className="text-xs text-grafit-500">
          Anmeldt af {a.anmelderNavn} · {relativTid(a.createdAt)}
        </span>
      </div>

      {a.reason && (
        <p className="mt-2 text-sm text-grafit-800">
          <span className="font-medium text-grafit-500">Begrundelse: </span>
          {a.reason}
        </p>
      )}
      {!a.reason && (
        <p className="mt-2 text-sm italic text-grafit-400">Ingen begrundelse angivet.</p>
      )}

      {/* Den anmeldte besked */}
      <div className="mt-3 rounded-lg border border-grafit-100 bg-grafit-50 p-3">
        {harBesked ? (
          <>
            <p className="text-xs text-grafit-500">
              {a.beskedSenderNavn || 'En ejer'} skrev · {a.beskedCreatedAt ? relativTid(a.beskedCreatedAt) : ''}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-grafit-900">
              {a.beskedBody}
            </p>
          </>
        ) : beskedSlettet ? (
          <p className="text-sm italic text-grafit-400">
            Beskeden er slettet. Anmeldelsen står som historik.
          </p>
        ) : (
          <p className="text-sm italic text-grafit-400">
            Hele samtalen er anmeldt (ingen enkelt besked udpeget).
          </p>
        )}
      </div>

      {/* Handlinger */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {a.conversationId && (
          <Link href={`/beskeder/${a.conversationId}`} className="btn-ghost !py-1 text-sm">
            Åbn samtale
          </Link>
        )}
        <span className="flex-1" />

        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetAnmeldelseHaandteret(a.id, !a.handled))}
        >
          {a.handled ? 'Markér som ny' : '✓ Markér håndteret'}
        </button>

        {harBesked &&
          (bekraeftSlet ? (
            <span className="flex items-center gap-1">
              <button
                className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
                disabled={pending}
                onClick={() => koer(() => sletAnmeldtBesked(a.id, a.messageId as string))}
              >
                Bekræft slet
              </button>
              <button
                className="btn-ghost !px-2 !py-1 text-sm"
                onClick={() => setBekraeftSlet(false)}
              >
                Fortryd
              </button>
            </span>
          ) : (
            <button
              className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
              onClick={() => setBekraeftSlet(true)}
            >
              🗑 Slet besked
            </button>
          ))}
      </div>
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function AnmeldelserPanel({
  anmeldelser,
}: {
  anmeldelser: BeskedAnmeldelse[];
}) {
  const [visHaandterede, setVisHaandterede] = useState(false);

  const nye = anmeldelser.filter((a) => !a.handled);
  const haandterede = anmeldelser.filter((a) => a.handled);
  const vist = visHaandterede ? anmeldelser : nye;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-kobber-100 text-kobber-800">{nye.length} nye</span>
        <span className="chip bg-grafit-100 text-grafit-600">{haandterede.length} håndterede</span>
        <span className="flex-1" />
        <button
          className="btn-ghost !py-1 text-sm"
          onClick={() => setVisHaandterede((v) => !v)}
        >
          {visHaandterede ? 'Vis kun nye' : 'Vis alle'}
        </button>
      </div>

      {vist.length === 0 ? (
        <p className="rounded-xl border border-grafit-200 bg-white px-4 py-8 text-center text-sm text-grafit-500">
          {visHaandterede
            ? 'Ingen anmeldelser endnu.'
            : 'Ingen nye anmeldelser. Alt er håndteret. 👍'}
        </p>
      ) : (
        <div className="space-y-2.5">
          {vist.map((a) => (
            <AnmeldelseKort key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
