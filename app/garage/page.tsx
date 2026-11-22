import { redirect } from 'next/navigation';
import { getCurrentUser, getModels, getVarianter, getMyCars, getMitNavn } from '@/lib/queries';
import MinGarageForm from '@/components/MinGarageForm';
import VisningsnavnForm from '@/components/VisningsnavnForm';
import SkiftMailForm from '@/components/SkiftMailForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Min garage' };

export default async function GarageSide() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/garage');

  const [models, varianter, biler, mitNavn] = await Promise.all([
    getModels(),
    getVarianter(),
    getMyCars(),
    getMitNavn(),
  ]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">🚗 Min garage</h1>
      <p className="mt-1 text-grafit-600">
        Dit navn og dine Zeekr - navnet vises som forfatter, bilerne bruges til &quot;mig
        med&quot;. Ejer du flere, kan du tilføje dem alle.
      </p>
      <VisningsnavnForm initial={mitNavn} />
      <MinGarageForm models={models} varianter={varianter} initialCars={biler} />
      <SkiftMailForm nuvaerende={user.email ?? ''} />
    </div>
  );
}
