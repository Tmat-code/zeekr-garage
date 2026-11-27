'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saetSprog } from '@/app/sprog-actions';
import { useOrdbog, useSprog } from '@/lib/i18n/klient';
import { SPROG_EGET_NAVN, UI_SPROG, type UiSprog } from '@/lib/i18n/sprog';

// Lille sprogvælger i footeren: "Sprog: Dansk · Svenska · English". Hvert sprog
// står skrevet på sig selv. Gemmer i cookien (og på profilen, hvis indlogget).
export default function SprogVaelger() {
  const t = useOrdbog();
  const aktuelt = useSprog();
  const router = useRouter();
  const [venter, startTransition] = useTransition();
  const [valgt, setValgt] = useState<UiSprog>(aktuelt);

  function vaelg(sprog: UiSprog) {
    if (sprog === aktuelt || venter) return;
    setValgt(sprog);
    startTransition(async () => {
      const res = await saetSprog(sprog);
      if (!res.ok) setValgt(aktuelt);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1" role="group" aria-label={t.sprog.label}>
      <span className="mr-1 text-grafit-400">{t.sprog.label}:</span>
      {UI_SPROG.map((s, i) => {
        const aktiv = (venter ? valgt : aktuelt) === s;
        return (
          <span key={s} className="inline-flex items-center">
            {i > 0 && (
              <span className="mx-1 text-grafit-300" aria-hidden="true">
                ·
              </span>
            )}
            <button
              type="button"
              lang={s}
              onClick={() => vaelg(s)}
              disabled={venter}
              aria-pressed={aktiv}
              className={
                aktiv
                  ? 'font-semibold text-kobber-700'
                  : 'text-grafit-500 hover:text-kobber-700 disabled:opacity-60'
              }
            >
              {SPROG_EGET_NAVN[s]}
            </button>
          </span>
        );
      })}
    </div>
  );
}
