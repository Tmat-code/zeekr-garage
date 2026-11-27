import { getSoftwareHistorikPerModel } from '@/lib/ota';
import SoftwareHistorik from '@/components/SoftwareHistorik';
import { hentOrdbog, hentSprog } from '@/lib/i18n/server';
import { oversaetOtaHistorik } from '@/lib/ota-oversaet';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await hentOrdbog();
  return { title: t.software.titel, description: t.software.metaBeskrivelse };
}

export default async function SoftwareSide() {
  // U1b: changelog-punkter + noter er skrevet paa dansk og maskinoversaettes til
  // laeserens sprog (rapportens pipeline, cachet) - originalen et klik vaek.
  const [raa, t, sprog] = await Promise.all([getSoftwareHistorikPerModel(), hentOrdbog(), hentSprog()]);
  const modeller = await oversaetOtaHistorik(raa, sprog);
  const sw = t.software;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-grafit-900 sm:text-4xl">
        {sw.titel}
      </h1>
      <p className="mt-3 max-w-2xl text-grafit-600">
        {sw.intro}
      </p>
      <p className="mt-2 text-sm text-grafit-400">
        {sw.noteFoer}{' '}
        <a
          href="/forum"
          className="font-medium text-kobber-700 hover:text-kobber-800 hover:underline"
        >
          {sw.noteLink}
        </a>{' '}
        {sw.noteEfter}
      </p>

      <SoftwareHistorik modeller={modeller} />
    </main>
  );
}
