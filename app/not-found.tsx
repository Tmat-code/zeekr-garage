import type { Metadata } from 'next';
import Link from 'next/link';
import { hentOrdbog } from '@/lib/i18n/server';

// P44: egen 404-side på læserens sprog (før: Next' standard "This page could
// not be found." på engelsk, uden sidens ramme). Bruges også af notFound() i
// fx /melding/<id> og forum-trådene.
export async function generateMetadata(): Promise<Metadata> {
  const t = await hentOrdbog();
  return { title: t.ikkeFundet.metaTitel };
}

export default async function IkkeFundet() {
  const t = await hentOrdbog();
  const f = t.ikkeFundet;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <p className="text-sm font-semibold tracking-widest text-kobber-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-grafit-900">{f.titel}</h1>
      <p className="mt-3 text-grafit-600">{f.tekst}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-kobber-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-kobber-600"
        >
          {f.forside}
        </Link>
        <Link
          href="/forum"
          className="inline-flex items-center justify-center rounded-lg border border-grafit-300 bg-white px-5 py-2.5 font-semibold text-grafit-700 transition-colors hover:bg-grafit-50"
        >
          {f.forum}
        </Link>
      </div>
    </div>
  );
}
