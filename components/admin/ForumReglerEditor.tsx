'use client';

import { useState, useTransition } from 'react';
import { gemForumRegler } from '@/app/admin/forum-actions';
import { relativTid } from '@/lib/tid';

export default function ForumReglerEditor({
  initial,
  updatedAt,
}: {
  initial: string;
  updatedAt: string | null;
}) {
  const [content, setContent] = useState(initial);
  const [pending, start] = useTransition();
  const [fejl, setFejl] = useState<string | null>(null);
  const [gemt, setGemt] = useState(false);
  const [sidst, setSidst] = useState<string | null>(updatedAt);

  const aendret = content !== initial;

  function gem() {
    setFejl(null);
    setGemt(false);
    start(async () => {
      try {
        await gemForumRegler(content);
        setGemt(true);
        setSidst(new Date().toISOString());
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke gemme reglerne.');
      }
    });
  }

  return (
    <div>
      <textarea
        className="input min-h-[280px] font-mono text-sm leading-relaxed"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setGemt(false);
        }}
        placeholder="Skriv forummets regler her..."
      />

      <p className="mt-2 text-xs text-grafit-400">
        Format: en tom linje starter et nyt afsnit, <code>## Overskrift</code> giver en
        underoverskrift, og en linje der starter med <code>-</code> bliver et punkt. Teksten vises
        på{' '}
        <a href="/forum/regler" target="_blank" className="text-kobber-700 hover:underline">
          /forum/regler
        </a>
        .
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {sidst ? (
          <span className="text-xs text-grafit-400">Sidst ændret {relativTid(sidst)}</span>
        ) : (
          <span className="text-xs text-grafit-400">Ikke gemt endnu</span>
        )}

        <span className="flex-1" />

        {gemt && !fejl && <span className="text-xs text-loest">Gemt.</span>}

        <button
          className="btn-primary !py-2 text-sm"
          disabled={pending || !aendret}
          onClick={gem}
        >
          {pending ? 'Gemmer...' : 'Gem regler'}
        </button>
      </div>

      {fejl && <p className="mt-2 text-xs text-kobber-700">{fejl}</p>}
    </div>
  );
}
