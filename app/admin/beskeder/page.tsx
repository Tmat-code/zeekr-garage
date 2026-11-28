import Link from 'next/link';
import { getBeskedAnmeldelser } from '@/lib/queries-admin';
import AnmeldelserPanel from '@/components/admin/AnmeldelserPanel';
import { hentVOrdbog } from '@/lib/i18n/vaerksted/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const v = await hentVOrdbog();
  return { title: v.metaTitel(v.nav.anmeldelser) };
}

export default async function BeskedAnmeldelserSide() {
  const [anmeldelser, v] = await Promise.all([getBeskedAnmeldelser(), hentVOrdbog()]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">🚩 {v.anmeldelser.titel}</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          {v.ramme.tilbage}
        </Link>
      </div>
      <p className="-mt-3 text-sm text-grafit-500">{v.anmeldelser.intro}</p>

      <AnmeldelserPanel anmeldelser={anmeldelser} />
    </div>
  );
}
