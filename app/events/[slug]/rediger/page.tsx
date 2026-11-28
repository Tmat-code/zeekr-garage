import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getEvent } from '@/lib/events';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import EventForm from '@/components/events/EventForm';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: (await hentOrdbog()).events.rediger.titel };
}

export default async function RedigerEventSide({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);
  if (!event) notFound();

  const ctx = await adminKontekst();
  const erModerator = rolleErModerator(ctx.rolle);
  if (!ctx.user) redirect(`/login?naeste=${encodeURIComponent(`/events/${params.slug}/rediger`)}`);
  if (!erModerator) redirect(`/events/${params.slug}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/events/${event.slug}`} className="text-sm text-grafit-500 hover:text-kobber-700">
        ← {event.title}
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-grafit-900">
        {(await hentOrdbog()).events.rediger.titel}
      </h1>
      <EventForm
        initial={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          description: event.description,
          location: event.location,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
        }}
      />
    </div>
  );
}
