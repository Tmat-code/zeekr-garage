import { Suspense } from 'react';
import NulstilForm from '@/components/NulstilForm';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.konto.nulstilMetaTitel };
}

export default async function NulstilSide() {
  const k = (await hentOrdbog()).konto;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">{k.nulstilTitel}</h1>
      <p className="mt-1 text-grafit-600">{k.nulstilIntro}</p>
      <Suspense>
        <NulstilForm />
      </Suspense>
    </div>
  );
}
