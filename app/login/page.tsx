import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import { getModels, getVarianter } from '@/lib/queries';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.konto.loginMetaTitel };
}

export default async function LoginSide() {
  const [models, varianter, t] = await Promise.all([getModels(), getVarianter(), hentOrdbog()]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">{t.konto.loginTitel}</h1>
      <p className="mt-1 text-grafit-600">{t.konto.loginIntro}</p>
      <Suspense>
        <LoginForm models={models} varianter={varianter} />
      </Suspense>
    </div>
  );
}
