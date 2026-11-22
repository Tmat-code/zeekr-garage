import Link from 'next/link';
import { adminKontekst } from '@/lib/admin';
import { getSamtaler } from '@/lib/beskeder';
import { relativTid } from '@/lib/tid';
import GarageBadge from '@/components/forum/GarageBadge';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Beskeder' };

export default async function BeskederSide() {
  const { user } = await adminKontekst();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Beskeder</h1>
        <div className="mt-4 rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-3 text-sm text-grafit-600">
          <Link
            href="/login?naeste=/beskeder"
            className="font-medium text-kobber-700 hover:underline"
          >
            Log ind
          </Link>{' '}
          for at se dine beskeder.
        </div>
      </div>
    );
  }

  const samtaler = await getSamtaler();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-grafit-900">Beskeder</h1>
          <p className="mt-1 text-sm text-grafit-500">
            Private samtaler med andre ejere.
          </p>
        </div>
        <Link href="/beskeder/ny" className="btn-primary shrink-0 !py-2 text-sm">
          Ny besked
        </Link>
      </div>

      {samtaler.length === 0 ? (
        <div className="mt-6 rounded-xl border border-grafit-200 bg-grafit-50 px-4 py-6 text-center text-sm text-grafit-500">
          Du har ingen samtaler endnu. Klik "Ny besked" for at skrive direkte til en ejer -
          eller start en fra en andens forum-indlæg.
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {samtaler.map((s) => (
            <Link
              key={s.id}
              href={`/beskeder/${s.id}`}
              className="flex items-start gap-3 rounded-xl border border-grafit-200 bg-white px-4 py-3 hover:border-kobber-300"
            >
              {s.ulaest && (
                <span
                  className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-kobber-500"
                  aria-hidden="true"
                />
              )}
              <div className={`min-w-0 flex-1 ${s.ulaest ? '' : 'pl-5'}`}>
                <div className="flex items-center gap-2">
                  <span
                    className={`truncate ${s.ulaest ? 'font-semibold text-grafit-900' : 'font-medium text-grafit-800'}`}
                  >
                    {s.andenPart.navn || 'Ejer'}
                  </span>
                  <GarageBadge bil={s.andenPart.bil} />
                </div>
                <p className="mt-0.5 truncate text-sm text-grafit-500">
                  {s.sidsteBesked ?? 'Ingen beskeder endnu'}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs text-grafit-400">
                {relativTid(s.sidsteTidspunkt)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
