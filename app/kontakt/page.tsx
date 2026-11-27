import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import KontaktForm from '@/components/KontaktForm';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.kontakt.metaTitel };
}

// Privat henvendelses-kanal til staben - IKKE den offentlige feedback (/feedback
// = bil-fejl til Zeekr) og IKKE "Om Zeekr Garage"-forumgruppen (offentlige
// oensker/fejl om siden). Her: klage over en bruger, GDPR/sikkerhed, personligt.
// Kun indloggede kan skrive (navn/konto foelger med, mindst spam).
export default async function KontaktSide() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const t = await hentOrdbog();
  const k = t.kontakt;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">
        {k.titel}
      </h1>
      <p className="mt-2 text-grafit-600">{k.intro}</p>
      <p className="mt-2 text-sm text-grafit-500">
        {k.henvisFoer}
        <strong>{k.henvisFejl}</strong>
        {k.henvisMidt}
        <Link href="/feedback" className="text-kobber-700 hover:underline">
          {k.henvisLink}
        </Link>
        {k.henvisEfter}
        <strong>{k.henvisSiden}</strong>
        {k.henvisSlut}
      </p>

      <div className="mt-8">
        {user ? (
          <KontaktForm svarMailStandard={user.email ?? ''} />
        ) : (
          <div className="rounded-xl border border-grafit-200 bg-white p-5">
            <p className="font-semibold text-grafit-800">{k.logIndTitel}</p>
            <p className="mt-1 text-sm text-grafit-500">{k.logIndTekst}</p>
            <Link
              href="/login?naeste=/kontakt"
              className="btn-primary mt-4 inline-flex text-sm"
            >
              {t.faellesFejl.logInd}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
