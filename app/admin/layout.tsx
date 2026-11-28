import { redirect } from 'next/navigation';
import Link from 'next/link';
import { adminKontekst, rolleErAdmin, rolleErModerator, rolleErSuperadmin } from '@/lib/admin';
import { getAabneRapporterAntal } from '@/lib/queries-admin';
import AdminNav from '@/components/admin/AdminNav';
import { hentVOrdbog } from '@/lib/i18n/vaerksted/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, rolle, displayName } = await adminKontekst();

  // Server-gate: kun stab (superadmin/admin/moderator). Alle andre ryger til forsiden.
  if (!user || !rolleErModerator(rolle)) {
    redirect('/');
  }

  const [aabneRapporter, v] = await Promise.all([getAabneRapporterAntal(), hentVOrdbog()]);
  const rolleLabel = (v.roller as Record<string, string>)[rolle ?? ''] ?? rolle;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Titel + konto/site-handlinger (faste, vokser ikke) */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight text-grafit-900">
              🔧 {v.navn}
            </span>
          </Link>
          <p className="mt-0.5 text-sm text-grafit-500">
            {v.ramme.loggetIndSom}{' '}
            <span className="font-medium text-grafit-700">
              {displayName || user.email}
            </span>{' '}
            <span className="chip bg-kobber-100 text-kobber-800">
              {rolleLabel}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/" className="btn-ghost !py-1.5 text-sm">
            {v.ramme.tilForsiden}
          </Link>
          <form action="/logout" method="post">
            <button className="btn-ghost !py-1.5 text-sm" type="submit">
              {v.ramme.logUd}
            </button>
          </form>
        </div>
      </div>

      {/* Fane-navigation - egen raekke, wrapper naar den fyldes */}
      <div className="mb-6 border-b border-grafit-200 pb-4">
        <AdminNav
          aabneRapporter={aabneRapporter}
          erAdmin={rolleErAdmin(rolle)}
          erSuperadmin={rolleErSuperadmin(rolle)}
        />
      </div>

      {children}
    </div>
  );
}
