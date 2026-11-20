'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type ModelLite = { id: string; name: string };

export default function ConfirmButton({
  issueId,
  models,
  initialCount,
  initialConfirmed,
  isLoggedIn,
  naeste = '/',
}: {
  issueId: string;
  models: ModelLite[];
  initialCount: number;
  initialConfirmed: boolean;
  isLoggedIn: boolean;
  naeste?: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  // Ikke logget ind: knappen fører til login (læsning er fri, bidrag kræver konto).
  if (!isLoggedIn) {
    return (
      <button
        onClick={() => router.push(`/login?naeste=${encodeURIComponent(naeste)}`)}
        className="flex w-16 shrink-0 flex-col items-center rounded-lg border border-grafit-300 bg-white py-2 text-grafit-700 transition-colors hover:border-kobber-500 hover:text-kobber-700"
        aria-label="Log ind for at bekræfte denne fejl"
      >
        <span aria-hidden className="text-base leading-none">▲</span>
        <span className="text-xl font-semibold leading-tight">{count}</span>
        <span className="text-[10px] text-grafit-400">mig med</span>
      </button>
    );
  }

  async function bekraeft(modelId: string) {
    if (busy) return;
    setBusy(true);
    setPicking(false);
    setConfirmed(true);
    setCount((c) => c + 1);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      const { error } = await sb
        .from('confirmations')
        .insert({ issue_id: issueId, model_id: modelId, user_id: user.id });
      if (error) throw error;
      router.refresh();
    } catch {
      setConfirmed(false);
      setCount((c) => Math.max(0, c - 1));
    } finally {
      setBusy(false);
    }
  }

  async function fjern() {
    if (busy) return;
    setBusy(true);
    const forrige = count;
    setConfirmed(false);
    setCount((c) => Math.max(0, c - 1));
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      const { error } = await sb
        .from('confirmations')
        .delete()
        .eq('issue_id', issueId)
        .eq('user_id', user.id);
      if (error) throw error;
      router.refresh();
    } catch {
      setConfirmed(true);
      setCount(forrige);
    } finally {
      setBusy(false);
    }
  }

  function klik() {
    if (confirmed) return fjern();
    if (models.length <= 1) return bekraeft(models[0]?.id);
    setPicking((p) => !p);
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={klik}
        disabled={busy}
        className={`flex w-16 flex-col items-center rounded-lg border py-2 transition-colors ${
          confirmed
            ? 'border-kobber-500 bg-kobber-50 text-kobber-700'
            : 'border-grafit-300 bg-white text-grafit-700 hover:border-kobber-500 hover:text-kobber-700'
        }`}
        aria-label={confirmed ? 'Fjern min bekræftelse' : 'Jeg oplever også dette'}
      >
        <span aria-hidden className="text-base leading-none">▲</span>
        <span className="text-xl font-semibold leading-tight">{count}</span>
        <span className="text-[10px] text-grafit-400">{confirmed ? 'stemt' : 'mig med'}</span>
      </button>

      {picking && (
        <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-grafit-200 bg-white p-2 shadow-lg">
          <p className="px-1 pb-1 text-xs font-semibold text-grafit-500">Hvilken model har du?</p>
          <div className="flex flex-col gap-1">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => bekraeft(m.id)}
                className="rounded-md px-2 py-1.5 text-left text-sm text-grafit-800 hover:bg-kobber-50 hover:text-kobber-700"
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
