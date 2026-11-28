'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saetFastgjort, saetLaast, modFjernTraad } from '@/app/forum/actions';
import GrundVaelger from './GrundVaelger';
import { useOrdbog } from '@/lib/i18n/klient';

export default function TraadModeration({
  threadId,
  kategoriSlug,
  traadSlug,
  isPinned,
  isLocked,
  feedbackUrl,
}: {
  threadId: string;
  kategoriSlug: string;
  traadSlug: string;
  isPinned: boolean;
  isLocked: boolean;
  feedbackUrl?: string;
}) {
  const t = useOrdbog();
  const f = t.forum;
  const router = useRouter();
  const [fejl, setFejl] = useState<string | null>(null);
  const [fjerner, setFjerner] = useState(false);
  const [pending, start] = useTransition();

  function koer(fn: () => Promise<void>) {
    setFejl(null);
    start(async () => {
      try {
        await fn();
      } catch (e: any) {
        setFejl(e?.message ?? t.faellesFejl.nogetGikGalt);
      }
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-grafit-500">{f.moderering}</span>
        {feedbackUrl && (
          <Link
            href={feedbackUrl}
            className="rounded-lg border border-kobber-300 bg-kobber-50 px-2.5 py-1.5 text-sm font-medium text-kobber-700 hover:bg-kobber-100"
            title={f.opretSomFeedbackTitel}
          >
            {f.opretSomFeedback}
          </Link>
        )}
        <button
          className="btn-ghost !py-1.5 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetFastgjort(threadId, kategoriSlug, traadSlug, !isPinned))}
        >
          {isPinned ? f.fjernFastgoerelse : f.fastgoer}
        </button>
        <button
          className="btn-ghost !py-1.5 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetLaast(threadId, kategoriSlug, traadSlug, !isLocked))}
        >
          {isLocked ? f.laasOp : f.laas}
        </button>
        <button
          className="btn-ghost !py-1.5 text-sm hover:!border-kobber-600 hover:!text-kobber-700"
          disabled={pending}
          onClick={() => setFjerner((v) => !v)}
        >
          {f.fjernTraad}
        </button>
        {fejl && <span className="text-kobber-700">{fejl}</span>}
      </div>

      {/* Fjern tråd kræver nu en grund - forfatteren får en officiel notifikation. */}
      {fjerner && (
        <GrundVaelger
          pending={pending}
          submitLabel={f.fjernTraadBesked}
          onCancel={() => setFjerner(false)}
          onSubmit={(grund, fritekst) =>
            koer(async () => {
              await modFjernTraad(threadId, kategoriSlug, grund, fritekst);
              router.push(`/forum/${kategoriSlug}`);
            })
          }
        />
      )}
    </div>
  );
}
