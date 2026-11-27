import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import KontaktForm from '@/components/KontaktForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kontakt' };

// Privat henvendelses-kanal til staben - IKKE den offentlige feedback (/feedback
// = bil-fejl til Zeekr) og IKKE "Om Zeekr Garage"-forumgruppen (offentlige
// oensker/fejl om siden). Her: klage over en bruger, GDPR/sikkerhed, personligt.
// Kun indloggede kan skrive (navn/konto foelger med, mindst spam).
export default async function KontaktSide() {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">
        Kontakt staben
      </h1>
      <p className="mt-2 text-grafit-600">
        Noget der ikke hører hjemme offentligt? Skriv direkte og privat til os - fx en
        klage over en anden bruger, noget om sikkerhed eller persondata, eller noget
        personligt. Beskeden lander kun hos staben, ikke på forummet.
      </p>
      <p className="mt-2 text-sm text-grafit-500">
        Har du i stedet fundet en <strong>fejl på bilen</strong> eller et ønske til et board,
        så brug{' '}
        <Link href="/feedback" className="text-kobber-700 hover:underline">
          Meld en fejl
        </Link>
        . Ønsker eller fejl ved <strong>selve siden</strong> hører til i forumgruppen
        &quot;Om Zeekr Garage&quot;.
      </p>

      <div className="mt-8">
        {user ? (
          <KontaktForm svarMailStandard={user.email ?? ''} />
        ) : (
          <div className="rounded-xl border border-grafit-200 bg-white p-5">
            <p className="font-semibold text-grafit-800">Log ind for at skrive til staben</p>
            <p className="mt-1 text-sm text-grafit-500">
              Vi holder kanalen for indloggede ejere, så vi ved hvem vi taler med og undgår spam.
            </p>
            <Link
              href="/login?naeste=/kontakt"
              className="btn-primary mt-4 inline-flex text-sm"
            >
              Log ind
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
