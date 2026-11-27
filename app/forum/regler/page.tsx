import Link from 'next/link';
import { getForumRegler } from '@/lib/forum-regler';
import { relativTid } from '@/lib/i18n/format';
import ReglerIndhold from '@/components/forum/ReglerIndhold';

export const metadata = {
  title: 'Forum-regler',
  description: 'Spilleregler og tone i Zeekr Garages forum - sådan holder vi en god stemning.',
};

export const dynamic = 'force-dynamic';

export default async function ForumReglerSide() {
  const { content, updatedAt } = await getForumRegler();
  const harIndhold = content.trim().length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 text-sm text-grafit-400">
        <Link href="/forum" className="hover:text-kobber-700 hover:underline">
          Forum
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-grafit-600">Regler</span>
      </nav>

      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900 sm:text-3xl">
          Forum-regler
        </h1>
        {updatedAt && (
          <p className="mt-1 text-xs text-grafit-400">Opdateret {relativTid(updatedAt)}</p>
        )}

        <div className="mt-6">
          {harIndhold ? (
            <ReglerIndhold content={content} />
          ) : (
            <p className="text-grafit-500">
              Reglerne er ved at blive sat op. Kig forbi igen om lidt - i mellemtiden gælder god,
              almindelig fornuft: tal pænt, hold dig til emnet, og del ikke andres personlige
              oplysninger.
            </p>
          )}
        </div>
      </section>

      <p className="mt-6 text-sm text-grafit-500">
        Stødt på en rigtig fejl i stedet for et spørgsmål?{' '}
        <Link href="/feedback" className="font-medium text-kobber-700 hover:underline">
          Opret den på Feedback
        </Link>
        , så samler vi den struktureret til Zeekr.
      </p>
    </div>
  );
}
