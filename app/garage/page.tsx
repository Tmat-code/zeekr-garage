import { redirect } from 'next/navigation';
import { getCurrentUser, getModels, getVarianter, getMyCar, getMitNavn } from '@/lib/queries';
import MinGarageForm from '@/components/MinGarageForm';
import VisningsnavnForm from '@/components/VisningsnavnForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Min garage' };

export default async function GarageSide() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/garage');

  const [models, varianter, bil, mitNavn] = await Promise.all([
    getModels(),
    getVarianter(),
    getMyCar(),
    getMitNavn(),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">🚗 Min garage</h1>
      <p className="mt-1 text-grafit-600">
        Dit navn og din Zeekr - navnet vises som forfatter, bilen bruges til &quot;mig med&quot;.
      </p>
      <VisningsnavnForm initial={mitNavn} />
      <MinGarageForm
        models={models}
        varianter={varianter}
        initial={bil ? { modelId: bil.modelId, variantId: bil.variantId } : null}
      />
    </div>
  );
}
