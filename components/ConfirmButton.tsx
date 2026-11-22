'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { GarageBil } from '@/lib/types';

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
  userCars,
  initialCount,
  initialMine,
  isLoggedIn,
  naeste = '/',
}: {
  issueId: string;
  issueModelIds: string[];
  userCars: GarageBil[];
  initialCount: number;
  // Hvor mange af MINE biler der allerede har bekraeftet denne melding.
  initialMine: number;
  isLoggedIn: boolean;
  naeste?: string;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  // Antal af mine biler der har bekraeftet (0 = ikke stemt).
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);

  // De af brugerens biler som meldingens model(ler) faktisk rammer.
  const matchendeBiler = useMemo(
    () => userCars.filter((c) => issueModelIds.includes(c.modelId)),
    [userCars, issueModelIds],
  );
  const confirmed = mine > 0;

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
  if (userCars.length === 0) {
    return (
      <Boks
        count={count}
        tilstand="registrér"
        onClick={() => router.push('/garage')}
        title="Registrér din bil i Min garage for at stemme"
      />
    );
  }

  // Har bil(er), men meldingen rammer ingen af dem → kan ikke stemme.
  if (matchendeBiler.length === 0) {
    return (
      <Boks
        count={count}
        tilstand="mig med"
        disabled
        title={
          userCars.length === 1
            ? `Rammer ikke din ${userCars[0].modelName}`
            : 'Rammer ingen af dine biler'
        }
      />
    );
  }

  async function bekraeft() {
    if (busy) return;
    setBusy(true);
    const forrigeCount = count;
    const forrigeMine = mine;
    // Optimistisk: alle matchende biler bekraefter nu (delta = dem der manglede).
    const delta = matchendeBiler.length - mine;
    setMine(matchendeBiler.length);
    setCount((c) => c + Math.max(0, delta));
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      const raekker = matchendeBiler.map((c) => ({
        issue_id: issueId,
        model_id: c.modelId,
        variant_id: c.variantId,
        car_id: c.carId,
        user_id: user.id,
      }));
      // Upsert paa (issue_id, car_id): indsaetter kun de biler der mangler,
      // så gentryk eller en allerede-stemt bil ikke laver dubletter/fejl.
      const { error } = await sb
        .from('confirmations')
        .upsert(raekker, { onConflict: 'issue_id,car_id', ignoreDuplicates: true });
      if (error) throw error;
      router.refresh();
    } catch {
      setMine(forrigeMine);
      setCount(forrigeCount);
    } finally {
      setBusy(false);
    }
  }

  async function fjern() {
    if (busy) return;
    setBusy(true);
    const forrigeCount = count;
    const forrigeMine = mine;
    setCount((c) => Math.max(0, c - mine));
    setMine(0);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      // Fjern ALLE mine bilers bekraeftelser paa denne melding.
      const { error } = await sb
        .from('confirmations')
        .delete()
        .eq('issue_id', issueId)
        .eq('user_id', user.id);
      if (error) throw error;
      router.refresh();
    } catch {
      setMine(forrigeMine);
      setCount(forrigeCount);
    } finally {
      setBusy(false);
    }
  }

  const flere = matchendeBiler.length > 1;
  const titel = confirmed
    ? flere
      ? `Fjern mine ${mine} bekræftelser`
      : 'Fjern min bekræftelse'
    : flere
      ? `Bekræft med dine ${matchendeBiler.length} biler (én stemme pr. bil)`
      : `Bekræft med din ${matchendeBiler[0].modelName}${
          matchendeBiler[0].variantName ? ' ' + matchendeBiler[0].variantName : ''
        }`;

  return (
    <Boks
      count={count}
      tilstand={confirmed ? 'stemt' : 'mig med'}
      onClick={confirmed ? fjern : bekraeft}
      disabled={busy}
      title={titel}
    />
  );
}
