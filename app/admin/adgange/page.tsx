import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';
import { getAdgange } from '@/lib/queries-admin';
import AdgangePanel from '@/components/admin/AdgangePanel';

export const dynamic = 'force-dynamic';

export default async function AdgangeSide() {
  const [{ user }, data] = await Promise.all([adminKontekst(), getAdgange()]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">👥 Adgange</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          ← Tilbage til admin
        </Link>
      </div>

      <AdgangePanel
        brugere={data.brugere}
        invitationer={data.invitationer}
        megId={user?.id ?? ''}
      />
    </div>
  );
}
