'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { opretTraad } from '@/app/forum/actions';
import BilledeUpload from '@/components/forum/BilledeUpload';
import { useOrdbog } from '@/lib/i18n/klient';

export default function NyTraadForm({
  kategoriSlug,
  kategoriNavn,
}: {
  kategoriSlug: string;
  kategoriNavn: string;
}) {
  const f = useOrdbog().forum;
  const router = useRouter();
  const [titel, setTitel] = useState('');
  const [body, setBody] = useState('');
  const [billeder, setBilleder] = useState<string[]>([]);
  const [fejl, setFejl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setFejl(null);
    start(async () => {
      try {
        const url = await opretTraad(kategoriSlug, titel, body, billeder);
        router.push(url);
      } catch (e: any) {
        setFejl(e?.message ?? f.kunneIkkeOprette);
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="titel">
          {f.titelLabel}
        </label>
        <input
          id="titel"
          className="input"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder={f.titelPh(kategoriNavn)}
          maxLength={160}
        />
      </div>
      <div>
        <label className="label" htmlFor="body">
          {f.ditIndlaeg}
        </label>
        <textarea
          id="body"
          className="input min-h-[180px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={f.indlaegPh}
        />
      </div>
      <div>
        <label className="label">{f.billederValgfrit}</label>
        <BilledeUpload onChange={setBilleder} disabled={pending} />
      </div>
      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          disabled={pending || titel.trim().length < 3 || !body.trim()}
          onClick={send}
        >
          {pending ? f.opretter : f.opretTraad}
        </button>
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
