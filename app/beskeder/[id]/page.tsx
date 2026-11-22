import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminKontekst } from '@/lib/admin';
import { getSamtale } from '@/lib/beskeder';
import SamtaleView from '@/components/beskeder/SamtaleView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const s = await getSamtale(params.id);
  return { title: s ? `Besked med ${s.andenPart.navn ?? 'ejer'}` : 'Besked' };
}

export default async function SamtaleSide({ params }: { params: { id: string } }) {
  const { user } = await adminKontekst();
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href={`/login?naeste=/beskeder/${params.id}`}
          className="font-medium text-kobber-700 hover:underline"
        >
          Log ind
        </Link>{' '}
        for at se samtalen.
      </div>
    );
  }

  const samtale = await getSamtale(params.id);
  if (!samtale) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/beskeder" className="text-sm text-grafit-500 hover:text-kobber-700">
        ← Alle beskeder
      </Link>
      <SamtaleView
        convId={samtale.id}
        megId={user.id}
        andenPart={samtale.andenPart}
        initialBeskeder={samtale.beskeder}
        initialBlokeret={samtale.jegHarBlokeret}
      />
    </div>
  );
}
