import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';
import NyBeskedView from '@/components/beskeder/NyBeskedView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ny besked' };

export default async function NyBeskedSide() {
  const { user } = await adminKontekst();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Ny besked</h1>
        <div className="mt-4 rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-600">
          <Link href="/login?naeste=/beskeder/ny" className="font-medium text-kobber-700 hover:underline">
            Log ind
          </Link>{' '}
          for at skrive til en anden ejer.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/beskeder" className="text-sm text-grafit-500 hover:text-kobber-700">
        ← Beskeder
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-grafit-900">Ny besked</h1>
      <p className="mt-1 text-sm text-grafit-500">
        Skriv til en anden ejer - eller vælg flere for at lave en gruppe.
      </p>
      <NyBeskedView />
    </div>
  );
}
