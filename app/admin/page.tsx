import { getIssues, getForsideBeskedRaw } from '@/lib/queries';
import { getAdminStats, getSenesteAktivitet, getForumOverblik } from '@/lib/queries-admin';
import Overblik from '@/components/admin/Overblik';
import ModereringsTabel from '@/components/admin/ModereringsTabel';
import ForsideBeskedEditor from '@/components/admin/ForsideBeskedEditor';
import OprydningPanel from '@/components/admin/OprydningPanel';

export const dynamic = 'force-dynamic';

export default async function AdminForside() {
  const [stats, forum, aktivitet, issues, besked] = await Promise.all([
    getAdminStats(),
    getForumOverblik(),
    getSenesteAktivitet(12),
    getIssues(),
    getForsideBeskedRaw(),
  ]);

  return (
    <div className="space-y-6">
      <Overblik stats={stats} forum={forum} aktivitet={aktivitet} />

      <ForsideBeskedEditor initial={besked} />

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Alle meldinger</h2>
          <span className="text-sm text-grafit-400">{issues.length} i alt</span>
        </div>
        <ModereringsTabel issues={issues} />
      </section>

      <OprydningPanel />
    </div>
  );
}
