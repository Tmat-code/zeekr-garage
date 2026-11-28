import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';
import NyBeskedView from '@/components/beskeder/NyBeskedView';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: (await hentOrdbog()).beskeder.nyBesked };
}

export default async function NyBeskedSide() {
  const { user } = await adminKontekst();
  const o = await hentOrdbog();
  const t = o.beskeder;

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">{t.nyBesked}</h1>
        <div className="mt-4 rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-600">
          <Link href="/login?naeste=/beskeder/ny" className="font-medium text-kobber-700 hover:underline">
            {o.faellesFejl.logInd}
          </Link>{' '}
          {t.logIndNy}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/beskeder" className="text-sm text-grafit-500 hover:text-kobber-700">
        {t.tilbage}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-grafit-900">{t.nyBesked}</h1>
      <p className="mt-1 text-sm text-grafit-500">{t.nyIntro}</p>
      <NyBeskedView />
    </div>
  );
}
