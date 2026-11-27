import Link from 'next/link';
import {
  getModels,
  getIssues,
  getMyConfirmedCounts,
  getCurrentUser,
  getMyCars,
} from '@/lib/queries';
import FejlBoard from '@/components/FejlBoard';
import { hentOrdbog } from '@/lib/i18n/server';
import { medTitelOversaettelser } from '@/lib/titel-oversaet';

export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.feedback.metaTitel };
}

// Altid frisk fra databasen (offentlig læsning, ingen statisk caching).
export const dynamic = 'force-dynamic';

export default async function FeedbackSide() {
  const [models, raaIssues, myCounts, user, userCars, t] = await Promise.all([
    getModels(),
    getIssues(),
    getMyConfirmedCounts(),
    getCurrentUser(),
    getMyCars(),
    hentOrdbog(),
  ]);
  // U3b: titler på alle sprog (fra cachen) - visning + søgning på tværs af sprog.
  const issues = await medTitelOversaettelser(raaIssues);
  const f = t.feedback;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Intro */}
      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900 sm:text-3xl">
          {f.titel}
        </h1>
        <p className="mt-2 max-w-2xl text-grafit-600">{f.intro}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/meld?type=fejl" className="btn-primary">{f.meldFejl}</Link>
          <Link href="/meld?type=oenske" className="btn-secondary">{f.foreslaaOenske}</Link>
          {!user && <Link href="/login" className="btn-ghost">{f.logIndForAtBidrage}</Link>}
        </div>
        <p className="mt-4 text-sm text-grafit-400">{f.note}</p>
      </section>

      <section className="mt-8">
        <FejlBoard
          issues={issues}
          models={models}
          userCars={userCars}
          myCounts={myCounts}
          isLoggedIn={!!user}
        />
      </section>
    </div>
  );
}
