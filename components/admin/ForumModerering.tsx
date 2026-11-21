'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import type { AdminForumTraad, AdminForumIndlaeg } from '@/lib/queries-admin';
import { saetFastgjort, saetLaast, fjernTraad, fjernIndlaeg } from '@/app/forum/actions';

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

function TraadRaekke({ t }: { t: AdminForumTraad }) {
  const { pending, fejl, koer } = useKoer();
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const url = `/forum/${t.kategoriSlug}/${t.slug}`;

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {t.isPinned && <span title="Fastgjort">📌</span>}
            {t.isLocked && <span title="Låst">🔒</span>}
            <Link href={url} className="font-medium text-grafit-900 hover:text-kobber-700">
              {t.title}
            </Link>
          </div>
          <p className="mt-0.5 text-xs text-grafit-500">
            {t.kategoriNavn} · {t.forfatter || 'Ejer'} · {t.replyCount} svar · {t.viewCount} visninger ·{' '}
            {relativTid(t.lastPostAt)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetFastgjort(t.id, t.kategoriSlug, t.slug, !t.isPinned))}
        >
          {t.isPinned ? 'Fjern fastgør.' : '📌 Fastgør'}
        </button>
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetLaast(t.id, t.kategoriSlug, t.slug, !t.isLocked))}
        >
          {t.isLocked ? 'Lås op' : '🔒 Lås'}
        </button>
        <span className="flex-1" />
        {bekraeftSlet ? (
          <span className="flex items-center gap-1">
            <button
              className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
              disabled={pending}
              onClick={() => koer(() => fjernTraad(t.id, t.kategoriSlug))}
            >
              Bekræft fjern
            </button>
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setBekraeftSlet(false)}>
              Fortryd
            </button>
          </span>
        ) : (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            onClick={() => setBekraeftSlet(true)}
          >
            🗑 Fjern tråd
          </button>
        )}
      </div>
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

function IndlaegRaekke({ p }: { p: AdminForumIndlaeg }) {
  const { pending, fejl, koer } = useKoer();
  const [bekraeftSlet, setBekraeftSlet] = useState(false);
  const url = `/forum/${p.kategoriSlug}/${p.traadSlug}`;

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      <p className="text-xs text-grafit-500">
        {p.forfatter || 'Ejer'} i{' '}
        <Link href={url} className="font-medium text-grafit-700 hover:text-kobber-700">
          {p.traadTitel}
        </Link>{' '}
        {p.isOpening && <span className="text-grafit-400">(åbning)</span>} · {relativTid(p.createdAt)}
      </p>
      <p className="mt-1 line-clamp-3 text-sm text-grafit-800">{p.body}</p>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="flex-1" />
        {p.isOpening ? (
          <span className="text-xs text-grafit-400">Åbnings-indlæg - brug “Fjern tråd”</span>
        ) : bekraeftSlet ? (
          <span className="flex items-center gap-1">
            <button
              className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700"
              disabled={pending}
              onClick={() => koer(() => fjernIndlaeg(p.id, p.kategoriSlug, p.traadSlug))}
            >
              Bekræft fjern
            </button>
            <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setBekraeftSlet(false)}>
              Fortryd
            </button>
          </span>
        ) : (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 text-sm font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            onClick={() => setBekraeftSlet(true)}
          >
            🗑 Fjern
          </button>
        )}
      </div>
      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function ForumModerering({
  traade,
  indlaeg,
}: {
  traade: AdminForumTraad[];
  indlaeg: AdminForumIndlaeg[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
          Seneste tråde ({traade.length})
        </h3>
        {traade.length === 0 ? (
          <p className="text-sm text-grafit-500">Ingen tråde endnu.</p>
        ) : (
          <div className="space-y-2.5">
            {traade.map((t) => (
              <TraadRaekke key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
          Seneste indlæg ({indlaeg.length})
        </h3>
        {indlaeg.length === 0 ? (
          <p className="text-sm text-grafit-500">Ingen indlæg endnu.</p>
        ) : (
          <div className="space-y-2.5">
            {indlaeg.map((p) => (
              <IndlaegRaekke key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
