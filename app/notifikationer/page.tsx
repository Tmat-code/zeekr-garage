import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries';
import { getNotifikationerSide } from '@/lib/notifikationer';
import NotifikationerListe from '@/components/NotifikationerListe';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.notif.metaTitel };
}

export default async function NotifikationerSide() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?naeste=/notifikationer');

  const [initial, t] = await Promise.all([getNotifikationerSide(20), hentOrdbog()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">{t.notif.titel}</h1>
      <p className="mt-1 text-grafit-600">{t.notif.intro}</p>
      <div className="mt-6">
        <NotifikationerListe userId={user.id} initial={initial} />
      </div>
    </div>
  );
}
