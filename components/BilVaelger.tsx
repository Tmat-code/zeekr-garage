'use client';

import type { VariantMap } from '@/lib/types';

export type BilValg = { modelId: string; variantId: string; ejerIkke: boolean };

export default function BilVaelger({
  models,
  varianter,
  value,
  onChange,
}: {
  models: { id: string; name: string }[];
  varianter: VariantMap;
  value: BilValg;
  onChange: (v: BilValg) => void;
}) {
  const vs = value.modelId ? (varianter[value.modelId] ?? []) : [];

  return (
    <div className="space-y-2">
      {!value.ejerIkke && (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="input"
            value={value.modelId}
            onChange={(e) => {
              const modelId = e.target.value;
              const enVariant = (varianter[modelId] ?? []).length === 1;
              onChange({
                ...value,
                modelId,
                variantId: enVariant ? varianter[modelId][0].id : '',
              });
            }}
          >
            <option value="">Vælg model…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={value.variantId}
            disabled={!value.modelId || vs.length <= 1}
            onChange={(e) => onChange({ ...value, variantId: e.target.value })}
          >
            <option value="">{vs.length > 1 ? 'Vælg variant…' : vs.length === 1 ? vs[0].name : '—'}</option>
            {vs.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-grafit-600">
        <input
          type="checkbox"
          checked={value.ejerIkke}
          onChange={(e) => onChange({ modelId: '', variantId: '', ejerIkke: e.target.checked })}
        />
        Ejer ikke en Zeekr endnu
      </label>
    </div>
  );
}
