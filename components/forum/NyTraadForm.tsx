'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { opretTraad } from '@/app/forum/actions';

export default function NyTraadForm({
  kategoriSlug,
  kategoriNavn,
}: {
  kategoriSlug: string;
  kategoriNavn: string;
}) {
  const router = useRouter();
  const [titel, setTitel] = useState('');
  const [body, setBody] = useState('');
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setFejl(null);
    start(async () => {
      try {
        const url = await opretTraad(kategoriSlug, titel, body);
        router.push(url);
      } catch (e: any) {
        setFejl(e?.message ?? 'Kunne ikke oprette tråden.');
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="titel">
          Titel
        </label>
        <input
          id="titel"
          className="input"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={`Hvad vil du tage op i ${kategoriNavn}?`}
          maxLength={160}
        />
      </div>
      <div>
        <label className="label" htmlFor="body">
          Dit indlæg
        </label>
        <textarea
          id="body"
          className="input min-h-[180px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Skriv løs — spørgsmål, erfaring eller en god historie."
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          disabled={pending || titel.trim().length < 3 || !body.trim()}
          onClick={send}
        >
          {pending ? 'Opretter…' : 'Opret tråd'}
        </button>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
