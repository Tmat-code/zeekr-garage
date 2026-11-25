import Link from 'next/link';
import {
  getModels,
  getIssues,
  getMyConfirmedCounts,
  getCurrentUser,
  getMyCars,
} from '@/lib/queries';
import FejlBoard from '@/components/FejlBoard';

export const metadata = { title: 'Feedback' };

// Altid frisk fra databasen (offentlig læsning, ingen statisk caching).
export const dynamic = 'force-dynamic';

export default async function FeedbackSide() {
  const [models, issues, myCounts, user, userCars] = await Promise.all([
    getModels(),
    getIssues(),
    getMyConfirmedCounts(),
    getCurrentUser(),
    getMyCars(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Intro */}
      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900 sm:text-3xl">
          Feedback
        </h1>
        <p className="mt-2 max-w-2xl text-grafit-600">
          Meld fejl og ønsker, bekræft dem sammen, og stem de vigtigste op. Vi samler dem i
          konstruktive rapporter til Zeekr - som en medspiller, der vil se gode biler blive endnu bedre.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/meld?type=fejl" className="btn-primary">Meld en fejl</Link>
          <Link href="/meld?type=oenske" className="btn-secondary">Foreslå et ønske</Link>
          {!user && <Link href="/login" className="btn-ghost">Log ind for at bidrage</Link>}
        </div>
        <p className="mt-4 text-sm text-grafit-400">
          Alle kan læse. Login kræves kun for at melde, bekræfte eller kommentere.
        </p>
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
