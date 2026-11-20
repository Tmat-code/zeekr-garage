'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { VariantMap } from '@/lib/types';

type ModelLite = { id: string; name: string };
type Step = 'idle' | 'model' | 'variant';

export default function ConfirmButton({
  issueId,
  models,
  varianter,
  initialCount,
  initialConfirmed,
  isLoggedIn,
  naeste = '/',
}: {
  issueId: string;
  models: ModelLite[];
  varianter: VariantMap;
  initialCount: number;
  initialConfirmed: boolean;
  isLoggedIn: boolean;
  naeste?: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [step, setStep] = useState<Step>('idle');
  const [valgtModel, setValgtModel] = useState<ModelLite | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function bekraeft(modelId: string, variantId: string | null) {
    if (busy) return;
    setBusy(true);
    setStep('idle');
    setValgtModel(null);
    setConfirmed(true);
    setCount((c) => c + 1);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      const { error } = await sb.from('confirmations').insert({
        issue_id: issueId,
        model_id: modelId,
        user_id: user.id,
        variant_id: variantId,
      });
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

  // Når en model er valgt: spring variant-valg over hvis 0-1 variant.
  function vaelgModel(m: ModelLite) {
    const vs = varianter[m.id] ?? [];
    if (vs.length > 1) {
      setValgtModel(m);
      setStep('variant');
    } else {
      bekraeft(m.id, vs[0]?.id ?? null);
    }
  }

  function klik() {
    if (confirmed) return fjern();
    if (step !== 'idle') {
      setStep('idle');
      setValgtModel(null);
      return;
    }
    if (models.length > 1) {
      setStep('model');
    } else if (models.length === 1) {
      vaelgModel(models[0]);
    }
  }

  const varianterForValgt = valgtModel ? (varianter[valgtModel.id] ?? []) : [];

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

      {step === 'model' && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-lg border border-grafit-200 bg-white p-2 shadow-lg">
          <p className="px-1 pb-1 text-xs font-semibold text-grafit-500">Hvilken model har du?</p>
          <div className="flex flex-col gap-1">
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => vaelgModel(m)}
                className="rounded-md px-2 py-1.5 text-left text-sm text-grafit-800 hover:bg-kobber-50 hover:text-kobber-700"
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'variant' && valgtModel && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-grafit-200 bg-white p-2 shadow-lg">
          <p className="px-1 pb-1 text-xs font-semibold text-grafit-500">
            🚗 Hvilken {valgtModel.name.replace('Zeekr ', '')} har du?
          </p>
          <div className="flex flex-col gap-1">
            {varianterForValgt.map((v) => (
              <button
                key={v.id}
                onClick={() => bekraeft(valgtModel.id, v.id)}
                className="rounded-md px-2 py-1.5 text-left text-sm text-grafit-800 hover:bg-kobber-50 hover:text-kobber-700"
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
