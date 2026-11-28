import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminKontekst } from '@/lib/admin';
import { getSamtale } from '@/lib/beskeder';
import SamtaleView from '@/components/beskeder/SamtaleView';
import { hentOrdbog } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const [s, o] = await Promise.all([getSamtale(params.id), hentOrdbog()]);
  const t = o.beskeder;
  if (!s) return { title: t.metaBesked };
  return { title: s.erGruppe ? s.titel : t.metaBeskedMed(s.andenPart?.navn ?? t.ejer) };
}

export default async function SamtaleSide({ params }: { params: { id: string } }) {
  const { user } = await adminKontekst();
  const o = await hentOrdbog();
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href={`/login?naeste=/beskeder/${params.id}`}
          className="font-medium text-kobber-700 hover:underline"
        >
          {o.faellesFejl.logInd}
        </Link>{' '}
        {o.beskeder.logIndSamtale}
      </div>
    );
  }

  const samtale = await getSamtale(params.id);
  if (!samtale) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/beskeder" className="text-sm text-grafit-500 hover:text-kobber-700">
        {o.beskeder.tilbageAlle}
      </Link>
      <SamtaleView
        convId={samtale.id}
        megId={user.id}
        erGruppe={samtale.erGruppe}
        titel={samtale.titel}
        erOpretter={samtale.erOpretter}
        eksplicitTitel={samtale.eksplicitTitel}
        deltagere={samtale.deltagere}
        andenPart={samtale.andenPart}
        initialBeskeder={samtale.beskeder}
        initialBlokeret={samtale.jegHarBlokeret}
      />
    </div>
  );
}
