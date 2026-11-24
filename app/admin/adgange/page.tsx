import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';
import { getAdgange, getBrugerOverblik } from '@/lib/queries-admin';
import AdgangePanel from '@/components/admin/AdgangePanel';
import BrugerAdministration from '@/components/admin/BrugerAdministration';

export const dynamic = 'force-dynamic';

export default async function AdgangeSide() {
  const { user, rolle } = await adminKontekst();
  const erAdmin = rolle === 'admin';

  // Bruger-overblik er moderator-læsbart; rolle-styring + invitationer er admin-only.
  const [overblik, adgange] = await Promise.all([
    getBrugerOverblik({ limit: 25 }),
    erAdmin ? getAdgange() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">👥 Adgange</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          ← Tilbage til admin
        </Link>
      </div>

      <BrugerAdministration initial={overblik} megId={user?.id ?? ''} erAdmin={erAdmin} />

      {erAdmin && adgange && (
        <AdgangePanel
          brugere={adgange.brugere}
          invitationer={adgange.invitationer}
          megId={user?.id ?? ''}
        />
      )}
    </div>
  );
}
