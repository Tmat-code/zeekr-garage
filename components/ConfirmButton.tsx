'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { MinBil } from '@/lib/types';

function Boks({
  count,
  tilstand,
  onClick,
  title,
  disabled,
}: {
  count: number;
  tilstand: 'stemt' | 'mig med' | 'registrér';
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  const aktiv = tilstand === 'stemt';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex w-16 shrink-0 flex-col items-center rounded-lg border py-2 transition-colors disabled:cursor-default ${
        aktiv
          ? 'border-kobber-500 bg-kobber-50 text-kobber-700'
          : 'border-grafit-300 bg-white text-grafit-700 enabled:hover:border-kobber-500 enabled:hover:text-kobber-700'
      }`}
    >
      <span aria-hidden className="text-base leading-none">▲</span>
      <span className="text-xl font-semibold leading-tight">{count}</span>
      <span className="text-[10px] text-grafit-400">{tilstand}</span>
    </button>
  );
}

export default function ConfirmButton({
  issueId,
  issueModelIds,
  userCar,
  initialCount,
  initialConfirmed,
  isLoggedIn,
  naeste = '/',
}: {
  issueId: string;
  issueModelIds: string[];
  userCar: MinBil | null;
  initialCount: number;
  initialConfirmed: boolean;
  isLoggedIn: boolean;
  naeste?: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [busy, setBusy] = useState(false);

  // Ikke logget ind → knappen fører til login.
  if (!isLoggedIn) {
    return (
      <Boks
        count={count}
        tilstand="mig med"
        onClick={() => router.push(`/login?naeste=${encodeURIComponent(naeste)}`)}
        title="Log ind for at stemme"
      />
    );
  }

  // Logget ind, men ingen bil registreret → kan ikke stemme.
  if (!userCar) {
    return (
      <Boks
        count={count}
        tilstand="registrér"
        onClick={() => router.push('/garage')}
        title="Registrér din bil i Min garage for at stemme"
      />
    );
  }

  // Har bil, men meldingen rammer ikke din model → kan ikke stemme.
  if (!issueModelIds.includes(userCar.modelId)) {
    return (
      <Boks
        count={count}
        tilstand="mig med"
        disabled
        title={`Rammer ikke din ${userCar.modelName}`}
      />
    );
  }

  async function bekraeft() {
    if (busy || !userCar) return;
    setBusy(true);
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
        model_id: userCar.modelId,
        user_id: user.id,
        variant_id: userCar.variantId,
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

  return (
    <Boks
      count={count}
      tilstand={confirmed ? 'stemt' : 'mig med'}
      onClick={confirmed ? fjern : bekraeft}
      disabled={busy}
      title={
        confirmed
          ? 'Fjern min bekræftelse'
          : `Bekræft med din ${userCar.modelName}${userCar.variantName ? ' ' + userCar.variantName : ''}`
      }
    />
  );
}
