'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import { grundLabel } from '@/lib/moderering';
import type { ForumRapport } from '@/lib/queries-admin';
import GrundVaelger from '@/components/forum/GrundVaelger';
import { modFjernTraad, modFjernIndlaeg, modAdvarBruger, afvisRapport } from '@/app/forum/actions';

type Handling = 'fjern' | 'advar' | null;

function RapportKort({ r }: { r: ForumRapport }) {
  const [handling, setHandling] = useState<Handling>(null);
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const erPost = !!r.postId;
  const url =
    r.kategoriSlug && r.traadSlug ? `/forum/${r.kategoriSlug}/${r.traadSlug}` : null;

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

  return (
    <div className={`rounded-xl border border-grafit-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-grafit-500">
        <span className="rounded-full bg-kobber-50 px-2 py-0.5 font-medium text-kobber-700">
          {erPost ? 'Indlæg' : 'Tråd'}
        </span>
        <span>Grund: {grundLabel(r.reason)}</span>
        {r.kilde === 'ai' && (
          <span className="rounded-full bg-grafit-100 px-2 py-0.5 text-grafit-600">AI-flag</span>
        )}
        <span>· rapporteret af {r.reporterNavn}</span>
        <span>· {relativTid(r.createdAt)}</span>
        {r.erFjernet && (
          <span className="rounded-full bg-grafit-100 px-2 py-0.5 text-grafit-500">
            allerede fjernet
          </span>
        )}
      </div>

      <p className="mt-1.5 text-sm text-grafit-500">
        {url ? (
          <Link href={url} className="font-medium text-grafit-800 hover:text-kobber-700">
            {r.traadTitel || 'Tråd'}
          </Link>
        ) : (
          <span className="font-medium text-grafit-800">{r.traadTitel || 'Tråd'}</span>
        )}{' '}
        · forfatter: {r.forfatterNavn}
      </p>

      {r.indhold && (
        <p className="mt-1 line-clamp-4 whitespace-pre-line rounded-lg bg-grafit-50 p-2 text-sm text-grafit-700">
          {r.indhold}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
          disabled={pending}
          onClick={() => setHandling((h) => (h === 'fjern' ? null : 'fjern'))}
        >
          🗑 {erPost ? 'Fjern indlæg' : 'Fjern tråd'}
        </button>
        {r.forfatterId && (
          <button
            className="rounded-lg border border-grafit-200 px-2.5 py-1 font-medium text-grafit-500 hover:border-kobber-500 hover:text-kobber-700"
            disabled={pending}
            onClick={() => setHandling((h) => (h === 'advar' ? null : 'advar'))}
          >
            🛡 Advar forfatter
          </button>
        )}
        <span className="flex-1" />
        <button
          className="btn-ghost !py-1 text-sm"
          disabled={pending}
          onClick={() => koer(() => afvisRapport(r.reportId))}
        >
          Afvis rapport
        </button>
      </div>

      {/* Fjern med grund (forvalgt = rapportens grund) + kobler rapporten handled. */}
      {handling === 'fjern' && (
        <GrundVaelger
          pending={pending}
          startGrund={r.reason ?? 'tone'}
          submitLabel={erPost ? 'Fjern indlæg + giv besked' : 'Fjern tråd + giv besked'}
          onCancel={() => setHandling(null)}
          onSubmit={(grund, fritekst) =>
            koer(async () => {
              if (erPost) {
                await modFjernIndlaeg(
                  r.postId!,
                  r.kategoriSlug ?? '',
                  r.traadSlug ?? '',
                  grund,
                  fritekst,
                  r.reportId,
                );
              } else {
                await modFjernTraad(r.threadId!, r.kategoriSlug ?? '', grund, fritekst, r.reportId);
              }
              setHandling(null);
            })
          }
        />
      )}

      {/* Advar forfatteren (uafhængigt af indholds-handlingen) + markér rapport. */}
      {handling === 'advar' && r.forfatterId && (
        <GrundVaelger
          pending={pending}
          startGrund={r.reason ?? 'tone'}
          submitLabel="Send advarsel"
          onCancel={() => setHandling(null)}
          onSubmit={(grund, fritekst) =>
            koer(async () => {
              await modAdvarBruger(r.forfatterId!, grund, fritekst, r.reportId);
              setHandling(null);
            })
          }
        />
      )}

      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}

export default function ForumRapporter({ rapporter }: { rapporter: ForumRapport[] }) {
  if (rapporter.length === 0) {
    return <p className="text-sm text-grafit-500">Ingen åbne rapporter. 🎉</p>;
  }
  return (
    <div className="space-y-2.5">
      {rapporter.map((r) => (
        <RapportKort key={r.reportId} r={r} />
      ))}
    </div>
  );
}
