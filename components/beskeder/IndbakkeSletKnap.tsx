'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sletSamtale } from '@/app/beskeder/actions';

// Slet-for-mig på en indbakke-række. Inline bekræft (ingen native dialog), og
// router.refresh() efter, så den skjulte samtale filtreres væk i getSamtaler.
export default function IndbakkeSletKnap({ convId }: { convId: string }) {
  const [bekraeft, setBekraeft] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function slet() {
    start(async () => {
      try {
        await sletSamtale(convId);
        router.refresh();
      } catch {
        setBekraeft(false);
      }
    });
  }

  if (bekraeft) {
    return (
      <div className="flex shrink-0 flex-col items-end justify-center gap-1 text-xs">
        <button
          className="font-medium text-kobber-700 hover:text-kobber-800"
          disabled={pending}
          onClick={slet}
        >
          Slet?
        </button>
        <button
          className="text-grafit-400 hover:text-grafit-600"
          disabled={pending}
          onClick={() => setBekraeft(false)}
        >
          Fortryd
        </button>
      </div>
    );
  }

  return (
    <button
      className="shrink-0 self-center px-1 text-xs text-grafit-400 hover:text-kobber-700"
      disabled={pending}
      onClick={() => setBekraeft(true)}
      aria-label="Slet samtale"
    >
      Slet
    </button>
  );
}
