import { getForsideBeskedRaw } from '@/lib/queries';
import { getAdminStats, getForumOverblik } from '@/lib/queries-admin';
import { erAdmin } from '@/lib/admin';
import Overblik from '@/components/admin/Overblik';
import Genveje from '@/components/admin/Genveje';
import ForsideBeskedEditor from '@/components/admin/ForsideBeskedEditor';

export const dynamic = 'force-dynamic';

export default async function AdminForside() {
  const [stats, forum, besked, kanAdmin] = await Promise.all([
    getAdminStats(),
    getForumOverblik(),
    getForsideBeskedRaw(),
    erAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <Overblik stats={stats} forum={forum} />

      <Genveje erAdmin={kanAdmin} />

      {/* Forside-beskeden er admin-kun - skjult for moderatorer. */}
      {kanAdmin && <ForsideBeskedEditor initial={besked} />}
    </div>
  );
}
