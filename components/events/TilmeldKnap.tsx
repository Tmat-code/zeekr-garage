'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { tilmeld, afmeld } from '@/app/events/actions';

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
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);

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

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-500">
        Eventet er aflyst.{' '}
        <span className="text-grafit-400">
          {signupCount} {signupCount === 1 ? 'var tilmeldt' : 'var tilmeldt'}.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-grafit-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-4">
        {!isLoggedIn ? (
          <Link
            href={`/login?naeste=${encodeURIComponent(naeste)}`}
            className="btn-primary"
          >
            Log ind for at melde dig til
          </Link>
        ) : tilmeldt ? (
          <button
            className="btn-ghost"
            disabled={pending}
            onClick={() => koer(() => afmeld(eventId, slug))}
          >
            Du er tilmeldt - afmeld
          </button>
        ) : (
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() => koer(() => tilmeld(eventId, slug))}
          >
            Meld dig til
          </button>
        )}
        <div>
          <p className="font-semibold text-grafit-900">
            🚗 {signupCount} {signupCount === 1 ? 'tilmeldt' : 'tilmeldte'}
          </p>
          {tilmeldt && <p className="text-sm" style={{ color: '#4f6f4a' }}>Du er med 👍</p>}
        </div>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
