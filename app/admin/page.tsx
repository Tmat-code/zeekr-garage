import { getIssues } from '@/lib/queries';
import { getAdminStats, getSenesteAktivitet } from '@/lib/queries-admin';
import Overblik from '@/components/admin/Overblik';
import ModereringsTabel from '@/components/admin/ModereringsTabel';

export const dynamic = 'force-dynamic';

export default async function AdminForside() {
  const [stats, aktivitet, issues] = await Promise.all([
    getAdminStats(),
    getSenesteAktivitet(12),
    getIssues(),
  ]);

  return (
    <div className="space-y-6">
      <Overblik stats={stats} aktivitet={aktivitet} />

      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">Alle meldinger</h2>
          <span className="text-sm text-grafit-400">{issues.length} i alt</span>
        </div>
        <ModereringsTabel issues={issues} />
      </section>
    </div>
  );
}
