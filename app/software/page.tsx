import { getSoftwareHistorikPerModel } from '@/lib/ota';
import SoftwareHistorik from '@/components/SoftwareHistorik';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'OTA-historik',
  description:
    'Software- og OTA-opdateringer til Zeekr-modellerne: version, dato og changelog pr. model. Vedligeholdt af ejere - nyeste version øverst.',
};

export default async function SoftwareSide() {
  const modeller = await getSoftwareHistorikPerModel();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-grafit-900 sm:text-4xl">
        OTA-historik
      </h1>
      <p className="mt-3 max-w-2xl text-grafit-600">
        Software- og OTA-opdateringer pr. model: version, dato og hvad der kom i den. Vælg din
        model og fold en version ud for at se changeloggen. Nyeste version står øverst.
      </p>
      <p className="mt-2 text-sm text-grafit-400">
        Vedligeholdt af os ejere. Vil du diskutere en opdatering, så tag den i{' '}
        <a
          href="/forum/software-ota"
          className="font-medium text-kobber-700 hover:text-kobber-800 hover:underline"
        >
          Software &amp; OTA
        </a>{' '}
        på forummet.
      </p>

      <SoftwareHistorik modeller={modeller} />
    </main>
  );
}
