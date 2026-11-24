import { getAlleSoftwareUpdates } from '@/lib/ota';
import { getModels } from '@/lib/queries';
import { erAdmin } from '@/lib/admin';
import OtaStyring from '@/components/admin/OtaStyring';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'OTA-historik - Værkstedet' };

export default async function AdminOtaSide() {
  const kan = await erAdmin();

  if (!kan) {
    return (
      <section className="rounded-2xl border border-grafit-200 bg-grafit-50 p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-grafit-900">OTA-historik</h2>
        <p className="text-sm text-grafit-500">
          Vedligeholdelse af OTA-historikken er forbeholdt admin.
        </p>
      </section>
    );
  }

  const [opdateringer, modeller] = await Promise.all([getAlleSoftwareUpdates(), getModels()]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-grafit-900">OTA-historik</h2>
          <a href="/software" target="_blank" className="text-sm text-kobber-700 hover:underline">
            Se på siden →
          </a>
        </div>
        <p className="mb-4 text-sm text-grafit-500">
          Log en software-/OTA-opdatering: vælg hvilke modeller den gælder, skriv version og dato,
          og indsæt changeloggen som ren tekst - én linje bliver ét punkt. Samme opdatering kan
          dække flere modeller på én gang. {opdateringer.length}{' '}
          {opdateringer.length === 1 ? 'opslag' : 'opslag'} i alt.
        </p>
        <OtaStyring
          opdateringer={opdateringer}
          modeller={modeller.map((m) => ({ id: m.id, slug: m.slug, name: m.name }))}
        />
      </section>
    </div>
  );
}
