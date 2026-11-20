import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import { getModels, getVarianter } from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Log ind' };

export default async function LoginSide() {
  const [models, varianter] = await Promise.all([getModels(), getVarianter()]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Log ind</h1>
      <p className="mt-1 text-grafit-600">For at melde, bekræfte og kommentere.</p>
      <Suspense>
        <LoginForm models={models} varianter={varianter} />
      </Suspense>
    </div>
  );
}
