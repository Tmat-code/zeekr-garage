import Link from 'next/link';
import { getBeskedAnmeldelser } from '@/lib/queries-admin';
import AnmeldelserPanel from '@/components/admin/AnmeldelserPanel';

export const dynamic = 'force-dynamic';

export default async function BeskedAnmeldelserSide() {
  const anmeldelser = await getBeskedAnmeldelser();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-grafit-900">🚩 Anmeldelser</h2>
        <Link href="/admin" className="btn-ghost !py-1.5 text-sm">
          ← Tilbage til admin
        </Link>
      </div>
      <p className="-mt-3 text-sm text-grafit-500">
        Anmeldte private beskeder. Du ser kun det, nogen har anmeldt - ikke øvrige
        samtaler. Markér som håndteret, eller slet en besked der overtræder reglerne.
      </p>

      <AnmeldelserPanel anmeldelser={anmeldelser} />
    </div>
  );
}
