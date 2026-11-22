'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Model, VariantMap, GarageBil } from '@/lib/types';
import BilVaelger, { type BilValg } from '@/components/BilVaelger';

// Afled visningsnavne lokalt (undgaar en ekstra forespoergsel efter navne).
function navne(
  models: Model[],
  varianter: VariantMap,
  modelId: string,
  variantId: string | null,
): { modelName: string; variantName: string | null } {
  const modelName = models.find((m) => m.id === modelId)?.name ?? '';
  const variantName = variantId
    ? (varianter[modelId] ?? []).find((v) => v.id === variantId)?.name ?? null
    : null;
  return { modelName, variantName };
}

export default function MinGarageForm({
  models,
  varianter,
  initialCars,
}: {
  models: Model[];
  varianter: VariantMap;
  initialCars: GarageBil[];
}) {
  const router = useRouter();
  const [biler, setBiler] = useState<GarageBil[]>(initialCars);
  const [ny, setNy] = useState<BilValg>({ modelId: '', variantId: '', ejerIkke: false });
  const [busy, setBusy] = useState(false);
  const [fejl, setFejl] = useState('');

  // Saet profilens primaere bil (den der vises i garage-badget) til den
  // tidligste tilbagevaerende bil - eller ryd den, hvis garagen er tom.
  async function synkPrimaer(sb: ReturnType<typeof supabaseBrowser>, userId: string) {
    const { data } = await sb
      .from('cars')
      .select('model_id, variant_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);
    const primaer = (data ?? [])[0] as any;
    await sb
      .from('profiles')
      .update({
        car_model_id: primaer?.model_id ?? null,
        car_variant_id: primaer?.variant_id ?? null,
      })
      .eq('id', userId);
  }

  async function hentBiler(
    sb: ReturnType<typeof supabaseBrowser>,
    userId: string,
  ): Promise<GarageBil[]> {
    const { data } = await sb
      .from('cars')
      .select('id, model_id, variant_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true });
    return ((data ?? []) as any[]).map((r) => ({
      carId: r.id,
      modelId: r.model_id,
      variantId: r.variant_id ?? null,
      ...navne(models, varianter, r.model_id, r.variant_id ?? null),
    }));
  }

  async function tilfoej() {
    setFejl('');
    const vs = ny.modelId ? (varianter[ny.modelId] ?? []) : [];
    if (!ny.modelId) return setFejl('Vælg din model.');
    if (vs.length > 1 && !ny.variantId) return setFejl('Vælg din variant.');
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      const variant_id = ny.variantId || vs[0]?.id || null;
      const { error } = await sb
        .from('cars')
        .insert({ owner_id: user.id, model_id: ny.modelId, variant_id });
      if (error) throw error;
      await synkPrimaer(sb, user.id);
      setBiler(await hentBiler(sb, user.id));
      setNy({ modelId: '', variantId: '', ejerIkke: false });
      router.refresh();
    } catch (e: any) {
      setFejl(e?.message ?? 'Kunne ikke tilføje bilen.');
    } finally {
      setBusy(false);
    }
  }

  async function fjern(carId: string) {
    setFejl('');
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error('ingen bruger');
      // Bilens bekraeftelser forsvinder med den (cascade) - det er meningen:
      // fjerner man bilen, taeller den ikke laengere i rapporterne.
      const { error } = await sb.from('cars').delete().eq('id', carId).eq('owner_id', user.id);
      if (error) throw error;
      await synkPrimaer(sb, user.id);
      setBiler(await hentBiler(sb, user.id));
      router.refresh();
    } catch (e: any) {
      setFejl(e?.message ?? 'Kunne ikke fjerne bilen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kort mt-6 space-y-5 p-6">
      <div>
        <label className="label">Dine biler</label>
        {biler.length === 0 ? (
          <p className="mt-1 text-sm text-grafit-500">
            Du har ingen biler registreret endnu. Tilføj din Zeekr nedenfor for at kunne
            bekræfte fejl og ønsker - ellers kan du læse og kommentere.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {biler.map((b) => (
              <li
                key={b.carId}
                className="flex items-center justify-between gap-3 rounded-lg border border-grafit-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 text-sm text-grafit-800">
                  <span className="font-medium">{b.modelName}</span>
                  {b.variantName && <span className="text-grafit-500"> · {b.variantName}</span>}
                </span>
                <button
                  onClick={() => fjern(b.carId)}
                  disabled={busy}
                  className="btn-ghost shrink-0 !px-2.5 !py-1 text-xs text-kobber-700"
                >
                  Fjern
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-grafit-200 pt-4">
        <label className="label">Tilføj en bil</label>
        <div className="mt-2">
          <BilVaelger
            models={models}
            varianter={varianter}
            value={ny}
            onChange={setNy}
            skjulEjerIkke
          />
        </div>
        <p className="mt-2 text-xs text-grafit-500">
          Ejer du flere Zeekr, så tilføj dem alle - en melding der rammer flere af dine
          modeller tæller så som én bekræftet bil pr. ramt bil, så rapporterne til Zeekr bliver
          præcise.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-primary" disabled={busy} onClick={tilfoej}>
            {busy ? 'Gemmer…' : 'Tilføj bil'}
          </button>
          {fejl && <span className="text-sm text-kobber-700">{fejl}</span>}
        </div>
      </div>
    </div>
  );
}
