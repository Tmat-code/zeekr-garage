import Link from 'next/link';
import { getModels, getCurrentUser } from '@/lib/queries';

export const metadata = {
  title: 'Forum',
  description: 'Forummet for Zeekr-ejere åbner snart — underforum pr. model, snak og guides.',
};

export const dynamic = 'force-dynamic';

export default async function ForumSide() {
  const [models, user] = await Promise.all([getModels(), getCurrentUser()]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <div className="relative overflow-hidden rounded-2xl bg-grafit-900 p-7 text-white ring-1 ring-grafit-800 sm:p-10">
        <div
          className="absolute right-0 top-0 h-56 w-56"
          style={{ background: 'radial-gradient(closest-side, rgba(194,104,63,.22), rgba(194,104,63,0) 70%)' }}
          aria-hidden="true"
        />
        <div className="relative">
          <span className="chip bg-kobber-500/15 text-kobber-300 ring-1 ring-inset ring-kobber-500/30">
            Åbner snart
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Forummet er på vej
          </h1>
          <p className="mt-3 max-w-xl text-grafit-300">
            Fællesskabets hjerte: hverdagssnak, spørgsmål og guides — med et eget underforum for
            hver model, så det hele bor ét sted med samme login som resten af siden.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {models.map((m) => (
              <span key={m.id} className="rounded-lg bg-grafit-800 px-3 py-1.5 text-sm text-grafit-200">
                {m.name}
              </span>
            ))}
            <span className="rounded-lg bg-grafit-800 px-3 py-1.5 text-sm text-grafit-400">Generel snak</span>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {user ? (
              <Link
                href="/feedback"
                className="inline-flex items-center justify-center rounded-lg bg-kobber-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-kobber-600"
              >
                Kig ind på feedback imens
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-kobber-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-kobber-600"
                >
                  Opret din profil
                </Link>
                <span className="text-sm text-grafit-400">så er du med fra dag ét.</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
