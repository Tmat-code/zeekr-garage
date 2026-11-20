import Link from 'next/link';
import { getModels, getIssues, getMyConfirmedIssueIds, getCurrentUser } from '@/lib/queries';
import FejlBoard from '@/components/FejlBoard';

// Altid frisk fra databasen (offentlig læsning, ingen statisk caching).
export const dynamic = 'force-dynamic';

export default async function Forside() {
  const [models, issues, mineSet, user] = await Promise.all([
    getModels(),
    getIssues(),
    getMyConfirmedIssueIds(),
    getCurrentUser(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Intro */}
      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-grafit-900 sm:text-3xl">
          Fejl-board for Zeekr-ejere
        </h1>
        <p className="mt-2 max-w-2xl text-grafit-600">
          Meld softwarefejl og ønsker til ny funktionalitet, bekræft dem sammen, og stem de
          vigtigste op. Én melding kan ramme flere modeller — så systemet viser når noget rammer
          en hel platform. De bekræftede meldinger samles i rapporter til Zeekr.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/meld" className="btn-primary">Meld en fejl</Link>
          <Link href="/meld?type=oenske" className="btn-secondary">Foreslå et ønske</Link>
          {!user && (
            <Link href="/login" className="btn-ghost">Log ind for at bidrage</Link>
          )}
        </div>
        <p className="mt-4 text-sm text-grafit-400">
          Alle kan læse. Login kræves kun for at melde, bekræfte eller kommentere.
        </p>
      </section>

      <section className="mt-8">
        <FejlBoard
          issues={issues}
          models={models}
          myConfirmedIds={[...mineSet]}
          isLoggedIn={!!user}
        />
      </section>
    </div>
  );
}
