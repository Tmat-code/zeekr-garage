import Link from 'next/link';
import { adminKontekst, rolleErAdmin, rolleErSuperadmin } from '@/lib/admin';
import { getAdgange, getBrugerOverblik } from '@/lib/queries-admin';
import AdgangePanel from '@/components/admin/AdgangePanel';
import BrugerAdministration from '@/components/admin/BrugerAdministration';
import { hentVOrdbog } from '@/lib/i18n/vaerksted/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = await hentVOrdbog();
  return { title: v.metaTitel(v.nav.adgange) };
}

// U6: Brugere-listen (advar/suspendér + admin-knapperne) er oversat; selve
// rolle-styringen (AdgangePanel, superadmin-kun) forbliver dansk.
export default async function AdgangeSide() {
  const [{ user, rolle }, v] = await Promise.all([adminKontekst(), hentVOrdbog()]);
  const erAdmin = rolleErAdmin(rolle);
  const erSuperadmin = rolleErSuperadmin(rolle);

  // Bruger-overblik + sanktioner er moderator-/admin-niveau; rolle-styring +
  // invitationer er nu superadmin-only (P32).
  const [overblik, adgange] = await Promise.all([
    getBrugerOverblik({ limit: 25 }),
    erSuperadmin ? getAdgange() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">👥 {v.brugere.adgangeTitel}</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          {v.ramme.tilbage}
        </Link>
      </div>

      <BrugerAdministration initial={overblik} megId={user?.id ?? ''} erAdmin={erAdmin} />

      {erSuperadmin && adgange && (
        <AdgangePanel
          brugere={adgange.brugere}
          invitationer={adgange.invitationer}
          megId={user?.id ?? ''}
        />
      )}
    </div>
  );
}
