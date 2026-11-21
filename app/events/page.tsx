import Link from 'next/link';
import { getEvents } from '@/lib/events';
import { adminKontekst } from '@/lib/admin';
import { datoTid } from '@/lib/tid';
import type { EventRow } from '@/lib/types';

export const metadata = {
  title: 'Events',
  description: 'Træf, køreture og meetups for Zeekr-ejere i Norden.',
};
export const dynamic = 'force-dynamic';

function EventKort({ e }: { e: EventRow }) {
  return (
    <Link
      href={`/events/${e.slug}`}
      className="block rounded-2xl border border-grafit-200 bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-grafit-900">{e.title}</h3>
        {e.isCancelled && (
          <span className="chip bg-grafit-100 text-grafit-500">Aflyst</span>
        )}
      </div>
      <p className="mt-1 text-sm text-kobber-700">📅 {datoTid(e.startsAt)}</p>
      {e.location && <p className="mt-0.5 text-sm text-grafit-500">📍 {e.location}</p>}
      <p className="mt-2 text-xs text-grafit-400">
        🚗 {e.signupCount} {e.signupCount === 1 ? 'tilmeldt' : 'tilmeldte'}
      </p>
    </Link>
  );
}

export default async function EventsSide() {
  const [{ kommende, afholdte }, ctx] = await Promise.all([getEvents(), adminKontekst()]);
  const erModerator = ctx.rolle === 'admin' || ctx.rolle === 'moderator';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <section className="rounded-2xl border border-grafit-200 bg-white px-6 py-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-grafit-900 sm:text-3xl">
              Events
            </h1>
            <p className="mt-2 max-w-2xl text-grafit-600">
              Træf, køreture og meetups for ejere. Meld dig til, så ved vi hvem der kommer - og du
              får besked, hvis der er nyt.
            </p>
          </div>
          {erModerator && (
            <Link href="/events/ny" className="btn-primary shrink-0">
              Opret event
            </Link>
          )}
        </div>
        <p className="mt-4 text-sm text-grafit-400">
          Events oprettes af holdet bag Garagen. Har du en god idé til et træf, så skriv i forummet
          under “Træf, køreture & events”.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-grafit-900">
          Kommende
        </h2>
        {kommende.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-grafit-300 bg-white px-6 py-10 text-center text-grafit-500">
            Ingen kommende events endnu.
          </p>
        ) : (
          <div className="space-y-3">
            {kommende.map((e) => (
              <EventKort key={e.id} e={e} />
            ))}
          </div>
        )}
      </section>

      {afholdte.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-grafit-500">
            Afholdte
          </h2>
          <div className="space-y-3 opacity-80">
            {afholdte.map((e) => (
              <EventKort key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
