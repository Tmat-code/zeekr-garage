import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const ROLLE_LABEL: Record<string, string> = {
  admin: 'admin',
  moderator: 'moderator',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, rolle, displayName } = await adminKontekst();

  // Server-gate: kun admin/moderator. Alle andre ryger til forsiden.
  if (!user || !(rolle === 'admin' || rolle === 'moderator')) {
    redirect('/');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-grafit-900">
              🔧 Værkstedet
            </span>
          </Link>
          <p className="mt-0.5 text-sm text-grafit-500">
            Logget ind som{' '}
            <span className="font-medium text-grafit-700">
              {displayName || user.email}
            </span>{' '}
            <span className="chip bg-kobber-100 text-kobber-800">
              {ROLLE_LABEL[rolle ?? ''] ?? rolle}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/rapport" className="btn-ghost !py-1.5 text-sm">
            📮 Rapport
          </Link>
          <Link href="/admin/aktivitet" className="btn-ghost !py-1.5 text-sm">
            📈 Aktivitet
          </Link>
          <Link href="/admin/adgange" className="btn-ghost !py-1.5 text-sm">
            👥 Adgange
          </Link>
          <Link href="/" className="btn-ghost !py-1.5 text-sm">
            ← Til forsiden
          </Link>
          <form action="/logout" method="post">
            <button className="btn-ghost !py-1.5 text-sm" type="submit">
              Log ud
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  );
}
