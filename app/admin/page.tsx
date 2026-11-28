import { getForsideBeskedRaw } from '@/lib/queries';
import { getAdminStats, getForumOverblik } from '@/lib/queries-admin';
import { erAdmin } from '@/lib/admin';
import Overblik from '@/components/admin/Overblik';
import Genveje from '@/components/admin/Genveje';
import ForsideBeskedEditor from '@/components/admin/ForsideBeskedEditor';
import { hentVOrdbog } from '@/lib/i18n/vaerksted/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = await hentVOrdbog();
  return { title: v.metaTitel(v.nav.overblik) };
}

export default async function AdminForside() {
  const [stats, forum, besked, kanAdmin, v] = await Promise.all([
    getAdminStats(),
    getForumOverblik(),
    getForsideBeskedRaw(),
    erAdmin(),
    hentVOrdbog(),
  ]);

  return (
    <div className="space-y-6">
      <Overblik v={v} stats={stats} forum={forum} />

      <Genveje v={v} erAdmin={kanAdmin} />

      {/* Forside-beskeden er admin-kun - skjult for moderatorer. */}
      {kanAdmin && <ForsideBeskedEditor initial={besked} />}
    </div>
  );
}
