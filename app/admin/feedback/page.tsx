import { getIssues } from '@/lib/queries';
import { getFeedbackAktivitet } from '@/lib/queries-admin';
import { erAdmin } from '@/lib/admin';
import ModereringsTabel from '@/components/admin/ModereringsTabel';
import OprydningPanel from '@/components/admin/OprydningPanel';
import StorageOprydningPanel from '@/components/admin/StorageOprydningPanel';
import AktivitetFeed from '@/components/admin/AktivitetFeed';
import { hentSprog } from '@/lib/i18n/server';
import { vordbog } from '@/lib/i18n/vaerksted';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = vordbog(await hentSprog());
  return { title: v.metaTitel(v.nav.feedback) };
}

export default async function AdminFeedbackSide() {
  const [issues, aktivitet, kanAdmin, sprog] = await Promise.all([
    getIssues(),
    getFeedbackAktivitet(12),
    erAdmin(),
    hentSprog(),
  ]);
  const v = vordbog(sprog);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">{v.feedback.alleMeldinger}</h2>
          <span className="text-sm text-grafit-400">{v.faelles.iAlt(issues.length)}</span>
        </div>
        <ModereringsTabel issues={issues} />
      </section>

      <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-grafit-900">{v.feedback.senesteAktivitet}</h2>
        <p className="mb-4 text-sm text-grafit-500">{v.feedback.aktivitetIntro}</p>
        <AktivitetFeed poster={aktivitet} sprog={sprog} tom={v.feedback.ingenAktivitet} />
      </section>

      {/* Oprydnings-værktøjerne er admin-kun - skjult for moderatorer. */}
      {kanAdmin && <OprydningPanel />}

      {kanAdmin && <StorageOprydningPanel />}
    </div>
  );
}
