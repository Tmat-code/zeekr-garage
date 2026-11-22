import Link from 'next/link';
import { SITE } from '@/lib/config';
import { adminKontekst } from '@/lib/admin';
import { getUlaestAntal } from '@/lib/notifikationer';
import Nav from './Nav';
import NotifBell from './NotifBell';

export default async function Header() {
  const { user, rolle } = await adminKontekst();
  const erModerator = rolle === 'admin' || rolle === 'moderator';
  // Klokke kun for indloggede; start-tal fra serveren (ingen tom-blink).
  const ulaest = user ? await getUlaestAntal() : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-grafit-200 bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight text-grafit-900">
            {SITE.name}
          </span>
          <span className="hidden whitespace-nowrap text-xs text-grafit-400 lg:inline">
            uofficielt ejer-community
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {user && <NotifBell userId={user.id} initialUnread={ulaest} />}
          <Nav erModerator={erModerator} indlogget={!!user} />
        </div>
      </div>
    </header>
  );
}
