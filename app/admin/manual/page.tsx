import { minRolle, rolleErAdmin, rolleErSuperadmin } from '@/lib/admin';
import ManualVisning from '@/components/admin/ManualVisning';
import { hentVOrdbog } from '@/lib/i18n/vaerksted/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = await hentVOrdbog();
  return { title: v.metaTitel(v.nav.manual) };
}

// Rollestyret manual. Layoutet gater allerede til stab, så her bruger vi bare
// rollen til at vælge visning: en moderator ser moderator-manualen (på sit
// sprog, U6), en admin ser admin-manualen (dansk; kan slå moderator-manualen
// op), og en superadmin ser desuden superadmin-laget (Audit + rolle-styring).
export default async function ManualSide() {
  const rolle = await minRolle();
  return (
    <ManualVisning erAdmin={rolleErAdmin(rolle)} erSuperadmin={rolleErSuperadmin(rolle)} />
  );
}
