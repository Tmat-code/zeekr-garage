import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import EventForm from '@/components/events/EventForm';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: (await hentOrdbog()).events.ny.titel };
}

export default async function NytEventSide() {
  const ctx = await adminKontekst();
  const erModerator = rolleErModerator(ctx.rolle);
  if (!ctx.user) redirect('/login?naeste=/events/ny');
  if (!erModerator) redirect('/events');
  const t = (await hentOrdbog()).events;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/events" className="text-sm text-grafit-500 hover:text-kobber-700">
        {t.tilbage}
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-grafit-900">
        {t.ny.titel}
      </h1>
      <p className="mt-1 text-sm text-grafit-500">{t.ny.intro}</p>
      <EventForm />
    </div>
  );
}
