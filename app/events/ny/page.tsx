import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';
import EventForm from '@/components/events/EventForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Opret event' };

export default async function NytEventSide() {
  const ctx = await adminKontekst();
  const erModerator = ctx.rolle === 'admin' || ctx.rolle === 'moderator';
  if (!ctx.user) redirect('/login?naeste=/events/ny');
  if (!erModerator) redirect('/events');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/events" className="text-sm text-grafit-500 hover:text-kobber-700">
        ← Events
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-grafit-900">
        Opret event
      </h1>
      <p className="mt-1 text-sm text-grafit-500">
        Brugere kan melde sig til, og du kan sende dem en opdatering bagefter.
      </p>
      <EventForm />
    </div>
  );
}
