import Link from 'next/link';
import { SITE } from '@/lib/config';
import { adminKontekst } from '@/lib/admin';

export default async function Header() {
  const { user, rolle } = await adminKontekst();
  const erModerator = rolle === 'admin' || rolle === 'moderator';

  return (
    <header className="sticky top-0 z-40 border-b border-grafit-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg font-extrabold tracking-tight text-grafit-900">
            {SITE.name}
          </span>
          <span className="hidden text-xs text-grafit-400 sm:inline">
            uofficielt ejer-community
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 text-sm">
          <Link href="/forum" className="rounded-lg px-3 py-1.5 text-grafit-600 hover:bg-grafit-100">
            Forum
          </Link>
          <Link href="/feedback" className="rounded-lg px-3 py-1.5 text-grafit-600 hover:bg-grafit-100">
            Feedback
          </Link>
          <Link href="/links" className="rounded-lg px-3 py-1.5 text-grafit-600 hover:bg-grafit-100">
            Links
          </Link>
          <Link href="/om" className="hidden rounded-lg px-3 py-1.5 text-grafit-600 hover:bg-grafit-100 sm:inline-flex">
            Om
          </Link>
          {erModerator && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 font-medium text-kobber-700 hover:bg-kobber-100"
            >
              🔧 Værkstedet
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <Link
                href="/garage"
                className="rounded-lg px-3 py-1.5 text-grafit-600 hover:bg-grafit-100"
              >
                🚗 Min garage
              </Link>
              <span className="hidden max-w-[160px] truncate text-xs text-grafit-500 sm:inline">
                {user.email}
              </span>
              <form action="/logout" method="post">
                <button className="btn-ghost !py-1.5 text-sm" type="submit">
                  Log ud
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn-primary !py-1.5 text-sm">
              Log ind
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
