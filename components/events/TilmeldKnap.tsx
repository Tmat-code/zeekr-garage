'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { tilmeld, afmeld, type EventSvar } from '@/app/events/actions';
import { useOrdbog } from '@/lib/i18n/klient';
import type { EventFejl } from '@/lib/events-fejl';

export default function TilmeldKnap({
  eventId,
  slug,
  tilmeldt,
  signupCount,
  isLoggedIn,
  isCancelled,
  naeste,
}: {
  eventId: string;
  slug: string;
  tilmeldt: boolean;
  signupCount: number;
  isLoggedIn: boolean;
  isCancelled: boolean;
  naeste: string;
}) {
  const t = useOrdbog().events;
  const [pending, start] = useTransition();
  // Nøgle, ikke tekst: fejlen skifter med sproget (U5).
  const [fejl, setFejl] = useState<EventFejl | null>(null);

  function koer(fn: () => Promise<EventSvar>, fallback: EventFejl) {
    setFejl(null);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) setFejl(r.fejl);
      } catch (e) {
        console.error(e);
        setFejl(fallback);
      }
    });
  }

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-500">
        {t.tilmeld.aflyst}{' '}
        <span className="text-grafit-400">{t.tilmeld.varTilmeldt(signupCount)}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-grafit-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-4">
        {!isLoggedIn ? (
          <Link href={`/login?naeste=${encodeURIComponent(naeste)}`} className="btn-primary">
            {t.tilmeld.logInd}
          </Link>
        ) : tilmeldt ? (
          <button
            className="btn-ghost"
            disabled={pending}
            onClick={() => koer(() => afmeld(eventId, slug), 'kunneIkkeAfmelde')}
          >
            {t.tilmeld.afmeld}
          </button>
        ) : (
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() => koer(() => tilmeld(eventId, slug), 'kunneIkkeTilmelde')}
          >
            {t.tilmeld.meldTil}
          </button>
        )}
        <div>
          <p className="font-semibold text-grafit-900">🚗 {t.tilmeldte(signupCount)}</p>
          {tilmeldt && (
            <p className="text-sm" style={{ color: '#4f6f4a' }}>
              {t.tilmeld.duErMed}
            </p>
          )}
        </div>
        {fejl && <span className="text-sm text-kobber-700">{t.fejl[fejl]}</span>}
      </div>
    </div>
  );
}
