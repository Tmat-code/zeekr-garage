import Link from 'next/link';
import { getForumGrupper } from '@/lib/forum';
import { getCurrentUser } from '@/lib/queries';
import ForumOversigt from '@/components/forum/ForumOversigt';
import TraadSoegeForm from '@/components/forum/TraadSoegeForm';

export const metadata = {
  title: 'Forum',
  description:
    'Fællesskabet for Zeekr-ejere i Norden - ét forum pr. model plus snak om opladning, software, tilbehør og livet som ejer.',
};

export const dynamic = 'force-dynamic';

export default async function ForumSide() {
  const [grupper, user] = await Promise.all([getForumGrupper(), getCurrentUser()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Intro */}
      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900 sm:text-3xl">
          Forum
        </h1>
        <p className="mt-2 max-w-2xl text-grafit-600">
          Snak, spørgsmål og erfaringer - med et eget forum for hver model. Stødt på en rigtig fejl?
          Den hører hjemme på{' '}
          <Link href="/feedback" className="font-medium text-kobber-700 hover:underline">
            Feedback
          </Link>
          , hvor vi samler den struktureret til Zeekr.
        </p>
        <p className="mt-4 text-sm text-grafit-400">
          Alle kan læse. Login kræves kun for at oprette tråde og svare.
          {!user && (
            <>
              {' '}
              <Link href="/login" className="font-medium text-kobber-700 hover:underline">
                Log ind
              </Link>
            </>
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span aria-hidden>📋</span>
          <span className="text-grafit-600">Ny her? Læs</span>
          <Link
            href="/forum/regler"
            className="font-medium text-kobber-700 hover:underline"
          >
            forum-reglerne
          </Link>
          <span className="text-grafit-400">- sådan er tonen i Garagen.</span>
        </div>
      </section>

      {/* Tværgående tråd-søgning: finder indhold på tværs af alle rum.
          (Kategori-filteret længere nede navigerer kun mellem rum.) */}
      <div className="mt-6">
        <TraadSoegeForm stor />
      </div>

      <div className="mt-8">
        <ForumOversigt grupper={grupper} />
      </div>
    </div>
  );
}
