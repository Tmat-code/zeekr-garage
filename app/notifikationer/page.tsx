import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries';
import { getNotifikationerSide } from '@/lib/notifikationer';
import NotifikationerListe from '@/components/NotifikationerListe';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifikationer' };

export default async function NotifikationerSide() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/notifikationer');

  const initial = await getNotifikationerSide(20);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">🔔 Notifikationer</h1>
      <p className="mt-1 text-grafit-600">
        Alt du er blevet prajet om - nyeste først. Klik for at gå til indlægget; slet dem du er
        færdig med.
      </p>
      <div className="mt-6">
        <NotifikationerListe userId={user.id} initial={initial} />
      </div>
    </div>
  );
}
