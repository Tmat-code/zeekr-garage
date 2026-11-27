import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEvent, getMinTilmelding } from '@/lib/events';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import { datoTid, relativTid } from '@/lib/i18n/format';
import TilmeldKnap from '@/components/events/TilmeldKnap';
import EventAdmin from '@/components/events/EventAdmin';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const e = await getEvent(params.slug);
  return { title: e ? e.title : 'Event' };
}

export default async function EventDetaljeSide({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);
  if (!event) notFound();

  const [mit, ctx] = await Promise.all([getMinTilmelding(event.id), adminKontekst()]);
  const erModerator = rolleErModerator(ctx.rolle);
  const naeste = `/events/${event.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/events" className="text-sm text-grafit-500 hover:text-kobber-700">
        ← Events
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {event.isCancelled && <span className="chip bg-grafit-100 text-grafit-500">Aflyst</span>}
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-grafit-900">{event.title}</h1>

      <div className="mt-3 space-y-1 text-grafit-700">
        <p>📅 {datoTid(event.startsAt)}{event.endsAt ? ` - ${datoTid(event.endsAt)}` : ''}</p>
        {event.location && <p>📍 {event.location}</p>}
        {event.opretter && <p className="text-sm text-grafit-400">Oprettet af {event.opretter}</p>}
      </div>

      {/* Føj til kalender (.ics) - kun når eventet har en dato */}
      {event.startsAt && (
        <div className="mt-3">
          <a
            href={`/events/${event.slug}/ics`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-grafit-200 bg-white px-3 py-1.5 text-sm font-medium text-grafit-700 hover:border-kobber-300 hover:text-kobber-700"
          >
            📅 Føj til kalender
          </a>
        </div>
      )}

      {event.description && (
        <div className="mt-5 rounded-2xl border border-grafit-200 bg-white p-5">
          <p className="whitespace-pre-line text-grafit-800">{event.description}</p>
        </div>
      )}

      <div className="mt-4">
        <TilmeldKnap
          eventId={event.id}
          slug={event.slug}
          tilmeldt={mit.tilmeldt}
          signupCount={event.signupCount}
          isLoggedIn={!!ctx.user}
          isCancelled={event.isCancelled}
          naeste={naeste}
        />
      </div>

      {/* Tilmeldte */}
      {event.deltagere.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {event.deltagere.map((d, i) => (
            <span key={i} className="chip bg-grafit-100 text-grafit-700">
              {d.navn || 'Ejer'}
            </span>
          ))}
        </div>
      )}

      {/* Opdateringer */}
      {event.opdateringer.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-grafit-400">
            Opdateringer
          </h2>
          <div className="space-y-3">
            {event.opdateringer.map((o) => (
              <div key={o.id} className="rounded-xl border border-grafit-200 bg-white p-4">
                <p className="whitespace-pre-line text-grafit-800">{o.body}</p>
                <p className="mt-1.5 text-xs text-grafit-400">
                  {o.forfatter || 'Holdet'} · {relativTid(o.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {erModerator && (
        <EventAdmin
          eventId={event.id}
          slug={event.slug}
          title={event.title}
          isCancelled={event.isCancelled}
        />
      )}
    </div>
  );
}
