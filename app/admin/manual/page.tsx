import { minRolle, rolleErAdmin } from '@/lib/admin';
import ManualVisning from '@/components/admin/ManualVisning';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manual - Værkstedet' };

// Rollestyret manual. Layoutet gater allerede til admin/moderator, så her
// bruger vi bare rollen til at vælge visning: en moderator ser moderator-
// manualen, en admin ser admin-manualen og kan slå moderator-manualen op.
export default async function ManualSide() {
  const erAdmin = rolleErAdmin(await minRolle());
  return <ManualVisning erAdmin={erAdmin} />;
}
