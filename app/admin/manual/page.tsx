import { minRolle, rolleErAdmin, rolleErSuperadmin } from '@/lib/admin';
import ManualVisning from '@/components/admin/ManualVisning';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manual - Værkstedet' };

// Rollestyret manual. Layoutet gater allerede til stab, så her bruger vi bare
// rollen til at vælge visning: en moderator ser moderator-manualen, en admin
// ser admin-manualen (og kan slå moderator-manualen op), og en superadmin ser
// desuden superadmin-laget (Audit + rolle-styring).
export default async function ManualSide() {
  const rolle = await minRolle();
  return (
    <ManualVisning erAdmin={rolleErAdmin(rolle)} erSuperadmin={rolleErSuperadmin(rolle)} />
  );
}
