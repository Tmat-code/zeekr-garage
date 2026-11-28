'use client';

import { useState } from 'react';
import { MOD_GRUND_VALUES } from '@/lib/moderering';
import { useOrdbog } from '@/lib/i18n/klient';

// Delt grund-vælger til moderings-handlinger OG rapportér-knappen. Viser de fem
// grunde som chips + (valgfrit) et fritekst-felt, og kalder onSubmit(grund, fritekst).
export default function GrundVaelger({
  onSubmit,
  onCancel,
  pending,
  submitLabel,
  startGrund = 'tone',
  visFritekst = true,
}: {
  onSubmit: (grund: string, fritekst: string) => void;
  onCancel: () => void;
  pending: boolean;
  submitLabel?: string;
  startGrund?: string;
  visFritekst?: boolean;
}) {
  const t = useOrdbog();
  const f = t.forum;
  const [grund, setGrund] = useState<string>(startGrund);
  const [fritekst, setFritekst] = useState('');

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-grafit-200 bg-grafit-50 p-3">
      <div className="flex flex-wrap gap-1.5">
        {MOD_GRUND_VALUES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setGrund(v)}
            className={`rounded-lg border px-2.5 py-1 text-sm transition ${
              grund === v
                ? 'border-kobber-500 bg-kobber-50 text-kobber-800'
                : 'border-grafit-200 text-grafit-600 hover:border-grafit-300'
            }`}
          >
            {(t.modGrund as Record<string, string>)[v] ?? v}
          </button>
        ))}
      </div>
      {visFritekst && (
        <input
          className="input !py-1.5 text-sm"
          value={fritekst}
          onChange={(e) => setFritekst(e.target.value)}
          placeholder={grund === 'dublet' ? f.dubletPh : f.uddybPh}
        />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg bg-kobber-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-kobber-700 disabled:opacity-50"
          disabled={pending}
          onClick={() => onSubmit(grund, fritekst)}
        >
          {submitLabel ?? f.bekraeft}
        </button>
        <button type="button" className="btn-ghost !px-2 !py-1 text-sm" disabled={pending} onClick={onCancel}>
          {f.fortryd}
        </button>
      </div>
    </div>
  );
}
