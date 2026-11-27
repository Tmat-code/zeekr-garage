'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saetSprog } from '@/app/sprog-actions';
import { useOrdbog, useSprog } from '@/lib/i18n/klient';
import { SPROG_EGET_NAVN, UI_SPROG, erUiSprog, type UiSprog } from '@/lib/i18n/sprog';

// "Sprog"-feltet i Min garage. Samme server-action som footerens vælger:
// gemmer på profilen (følger kontoen på tværs af enheder) + cookien.
// `gemtSprog` = profilens nuværende værdi (null = ikke valgt endnu -> sproget
// følger browseren/cookien, og det aktuelle sprog kan gemmes som det er).
export default function SprogFelt({ gemtSprog }: { gemtSprog: UiSprog | null }) {
  const t = useOrdbog();
  const aktuelt = useSprog();
  const router = useRouter();
  const [valgt, setValgt] = useState<UiSprog>(aktuelt);
  const [venter, startTransition] = useTransition();
  const [gemt, setGemt] = useState(false);
  const [paaProfil, setPaaProfil] = useState<UiSprog | null>(gemtSprog);
  const [fejl, setFejl] = useState(false);

  function gem() {
    setGemt(false);
    setFejl(false);
    startTransition(async () => {
      const res = await saetSprog(valgt);
      if (!res.ok || res.profilGemt === false) setFejl(true);
      else {
        setGemt(true);
        setPaaProfil(valgt);
      }
      router.refresh();
    });
  }

  return (
    <div className="kort mt-6 space-y-4 p-6">
      <div>
        <label className="label" htmlFor="ui-sprog">
          {t.sprog.label}
        </label>
        <select
          id="ui-sprog"
          className="input"
          value={valgt}
          onChange={(e) => {
            if (erUiSprog(e.target.value)) setValgt(e.target.value);
            setGemt(false);
            setFejl(false);
          }}
        >
          {UI_SPROG.map((s) => (
            <option key={s} value={s} lang={s}>
              {SPROG_EGET_NAVN[s]}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-grafit-500">{t.sprog.feltHjaelp}</p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={venter || (valgt === aktuelt && valgt === paaProfil)} onClick={gem}>
          {venter ? t.sprog.gemmer : t.sprog.gem}
        </button>
        {gemt && <span className="text-sm text-loest">{t.sprog.gemt}</span>}
        {fejl && <span className="text-sm text-kobber-700">{t.sprog.fejl}</span>}
      </div>
    </div>
  );
}
