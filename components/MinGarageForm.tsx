'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Model, VariantMap } from '@/lib/types';
import BilVaelger, { type BilValg } from '@/components/BilVaelger';

export default function MinGarageForm({
  models,
  varianter,
  initial,
}: {
  models: Model[];
  varianter: VariantMap;
  initial: { modelId: string; variantId: string | null } | null;
}) {
  const router = useRouter();
  const [bil, setBil] = useState<BilValg>(
    initial
      ? { modelId: initial.modelId, variantId: initial.variantId ?? '', ejerIkke: false }
      : { modelId: '', variantId: '', ejerIkke: true },
  );
  const [busy, setBusy] = useState(false);
  const [gemt, setGemt] = useState(false);
  const [fejl, setFejl] = useState('');

  async function gem() {
    setFejl('');
    setGemt(false);
    const vs = bil.modelId ? (varianter[bil.modelId] ?? []) : [];
    if (!bil.ejerIkke) {
      if (!bil.modelId) return setFejl('Vælg din model — eller markér "Ejer ikke en Zeekr endnu".');
      if (vs.length > 1 && !bil.variantId) return setFejl('Vælg din variant.');
    }
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      const model_id = bil.ejerIkke ? null : bil.modelId;
      const variant_id = bil.ejerIkke ? null : bil.variantId || vs[0]?.id || null;
      const { error } = await sb
        .from('profiles')
        .update({ car_model_id: model_id, car_variant_id: variant_id })
        .eq('id', user.id);
      if (error) throw error;
      setGemt(true);
      router.refresh();
    } catch (e: any) {
      setFejl(e?.message ?? 'Kunne ikke gemme.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kort mt-6 space-y-4 p-6">
      <div>
        <label className="label">Din bil</label>
        <BilVaelger models={models} varianter={varianter} value={bil} onChange={setBil} />
      </div>
      <p className="text-xs text-grafit-500">
        Din bil bruges til &quot;mig med&quot;-stemmer, så fejl tælles pr. rigtig model og variant.
        Vælger du &quot;ejer ikke endnu&quot;, kan du læse og kommentere, men ikke stemme.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={busy} onClick={gem}>
          {busy ? 'Gemmer…' : 'Gem'}
        </button>
        {gemt && <span className="text-sm text-loest">Gemt.</span>}
        {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
      </div>
    </div>
  );
}
