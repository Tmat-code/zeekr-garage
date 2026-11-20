import { Suspense } from 'react';
import NulstilForm from '@/components/NulstilForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vælg nyt password' };

export default function NulstilSide() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Vælg nyt password</h1>
      <p className="mt-1 text-grafit-600">Skriv et nyt password til din konto.</p>
      <Suspense>
        <NulstilForm />
      </Suspense>
    </div>
  );
}
