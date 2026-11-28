'use client';

// P43: aktive sammenlægninger (dublet lagt ind under en original) med Fortryd.
// Alle moderatorer kan fortryde (afklaret med Torben 28-11); RPC'en flytter
// stemmer, kommentarer og billeder tilbage og logges i P32-audit.

import { useState } from 'react';
import Link from 'next/link';
import { useSprog } from '@/lib/i18n/klient';
import { useVOrdbog } from '@/lib/i18n/vaerksted/klient';
import { DATO_LOCALE } from '@/lib/i18n/format';
import { useVKoer } from '@/components/admin/useVKoer';
import type { Sammenlaegning } from '@/lib/queries-admin';
import { fortrydSammenlaegning } from '@/app/admin/actions';

function Kort({ s }: { s: Sammenlaegning }) {
  const v = useVOrdbog();
  const f = v.feedback;
  const sprog = useSprog();
  const { pending, koer, fejl } = useVKoer();
  const [spoerg, setSpoerg] = useState(false);
  const dato = new Date(s.created_at).toLocaleString(DATO_LOCALE[sprog], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  });

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="grid gap-1.5 text-sm sm:grid-cols-[auto,1fr]">
        <span className="text-[10px] font-medium uppercase tracking-wide text-grafit-400 sm:pt-0.5">
          {f.dublet}
        </span>
        <Link href={`/melding/${s.dublet_id}`} target="_blank" className="text-grafit-700 hover:text-kobber-700">
          {s.dublet_titel}
        </Link>
        <span className="text-[10px] font-medium uppercase tracking-wide text-grafit-400 sm:pt-0.5">
          {f.original}
        </span>
        <Link
          href={`/melding/${s.original_id}`}
          target="_blank"
          className="font-medium text-grafit-900 hover:text-kobber-700"
        >
          {s.original_titel}
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-grafit-100 pt-3">
        <span className="flex-1 text-xs text-grafit-500">
          {f.flyttet(s.antal_stemmer, s.antal_droppede, s.antal_kommentarer, s.antal_billeder)}
          <span className="text-grafit-400"> · {f.af(s.aktoer_navn, dato)}</span>
        </span>
        {spoerg ? (
          <span className="flex items-center gap-1">
            <span className="mr-1 text-xs text-grafit-500">{f.fortrydSpoerg}</span>
            <button
              className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
              disabled={pending}
              onClick={() =>
                koer(() => fortrydSammenlaegning(s.id, s.dublet_id, s.original_id), () => setSpoerg(false))
              }
            >
              {f.fortrydKnap}
            </button>
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setSpoerg(false)}>
              {f.annuller}
            </button>
          </span>
        ) : (
          <button
            className="rounded-lg border border-grafit-300 px-2.5 py-1 text-sm font-medium text-grafit-700 hover:bg-grafit-50"
            disabled={pending}
            onClick={() => setSpoerg(true)}
          >
            {f.fortrydKnap}
          </button>
        )}
      </div>
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function SammenlagteListe({ poster }: { poster: Sammenlaegning[] }) {
  const v = useVOrdbog();
  if (poster.length === 0) {
    return <p className="text-sm text-grafit-500">{v.feedback.ingenSammenlagte}</p>;
  }
  return (
    <div className="space-y-2.5">
      {poster.map((s) => (
        <Kort key={s.id} s={s} />
      ))}
    </div>
  );
}
