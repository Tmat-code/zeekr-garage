'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saetFastgjort, saetLaast, fjernTraad } from '@/app/forum/actions';

export default function TraadModeration({
  threadId,
  kategoriSlug,
  traadSlug,
  isPinned,
  isLocked,
}: {
  threadId: string;
  kategoriSlug: string;
  traadSlug: string;
  isPinned: boolean;
  isLocked: boolean;
}) {
  const router = useRouter();
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

  return (
    <div className="mt-6 rounded-xl border border-dashed border-grafit-300 bg-grafit-50 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-grafit-500">🔧 Moderering:</span>
        <button
          className="btn-ghost !py-1.5 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetFastgjort(threadId, kategoriSlug, traadSlug, !isPinned))}
        >
          {isPinned ? 'Fjern fastgørelse' : '📌 Fastgør'}
        </button>
        <button
          className="btn-ghost !py-1.5 text-sm"
          disabled={pending}
          onClick={() => koer(() => saetLaast(threadId, kategoriSlug, traadSlug, !isLocked))}
        >
          {isLocked ? 'Lås op' : '🔒 Lås'}
        </button>
        <button
          className="btn-ghost !py-1.5 text-sm hover:!border-kobber-600 hover:!text-kobber-700"
          disabled={pending}
          onClick={() => {
            if (confirm('Fjern hele tråden? Den forsvinder fra forummet.')) {
              koer(async () => {
                await fjernTraad(threadId, kategoriSlug);
                router.push(`/forum/${kategoriSlug}`);
              });
            }
          }}
        >
          🗑 Fjern tråd
        </button>
        {fejl && <span className="text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
