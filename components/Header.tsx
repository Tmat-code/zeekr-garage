import Link from 'next/link';
import { SITE } from '@/lib/config';
import { adminKontekst, rolleErModerator } from '@/lib/admin';
import { getUlaestAntal } from '@/lib/notifikationer';
import { getAabneRapporterAntal } from '@/lib/queries-admin';
import { hentOrdbog } from '@/lib/i18n/server';
import Nav from './Nav';
import NotifBell from './NotifBell';

export default async function Header() {
  const [{ user, rolle }, t] = await Promise.all([adminKontekst(), hentOrdbog()]);
  const erModerator = rolleErModerator(rolle);
  // Klokke kun for indloggede; start-tal fra serveren (ingen tom-blink).
  const ulaest = user ? await getUlaestAntal() : 0;
  // Åbne forum-rapporter -> badge på Værkstedet (kun moderatorer).
  const aabneRapporter = erModerator ? await getAabneRapporterAntal() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-grafit-200 bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-grafit-900">
            {SITE.name}
          </span>
          <span className="hidden whitespace-nowrap text-xs text-grafit-400 lg:inline">
            {t.ramme.tagline}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {user && <NotifBell userId={user.id} initialUnread={ulaest} />}
          <Nav erModerator={erModerator} indlogget={!!user} aabneRapporter={aabneRapporter} />
        </div>
      </div>
    </header>
  );
}
