import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import type { AdminStats, AktivitetPost, ForumOverblik } from '@/lib/queries-admin';

function Tile({ tal, label }: { tal: number; label: string }) {
  return (
    <div className="rounded-xl border border-grafit-200 bg-white px-4 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-grafit-900">{tal}</div>
      <div className="mt-0.5 text-xs font-medium text-grafit-500">{label}</div>
    </div>
  );
}

const IKON: Record<AktivitetPost['kind'], string> = {
  melding: '🔧',
  bekraeftelse: '👍',
  forum_traad: '💬',
  forum_indlaeg: '↩️',
};

function tekst(a: AktivitetPost): JSX.Element {
  switch (a.kind) {
    case 'melding':
      return (
        <>
          Ny melding: <span className="font-medium">{a.titel}</span>
          {a.detalje && <span className="text-grafit-400"> · {a.detalje}</span>}
        </>
      );
    case 'bekraeftelse':
      return (
        <>
          Bekræftelse på <span className="font-medium">{a.titel}</span>
          {a.detalje && <span className="text-grafit-400"> · {a.detalje}</span>}
        </>
      );
    case 'forum_traad':
      return (
        <>
          Ny tråd: <span className="font-medium">{a.titel}</span>
          {a.detalje && <span className="text-grafit-400"> · {a.detalje}</span>}
        </>
      );
    case 'forum_indlaeg':
      return (
        <>
          Nyt svar i <span className="font-medium">{a.titel}</span>
        </>
      );
  }
}

export default function Overblik({
  stats,
  forum,
  aktivitet,
}: {
  stats: AdminStats;
  forum: ForumOverblik;
  aktivitet: AktivitetPost[];
}) {
  const aabne = stats.perStatus.ny + stats.perStatus.bekraeftet;

  return (
    <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-grafit-900">Overblik</h2>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-grafit-400">Feedback</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile tal={stats.meldinger} label="Meldinger i alt" />
        <Tile tal={stats.bekraeftelser} label="Bekræftelser i alt" />
        <Tile tal={aabne} label="Åbne (ny + bekræftet)" />
        <Tile tal={stats.perStatus.loest_i_ota} label="Løst i OTA" />
      </div>

      <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-grafit-400">Forum</h3>
      <div className="grid grid-cols-3 gap-3">
        <Tile tal={forum.kategorier} label="Kategorier" />
        <Tile tal={forum.traade} label="Tråde" />
        <Tile tal={forum.indlaeg} label="Indlæg" />
      </div>

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-grafit-400">
        Seneste aktivitet — hele sitet
      </h3>

      {aktivitet.length === 0 ? (
        <p className="text-sm text-grafit-500">Ingen aktivitet endnu.</p>
      ) : (
        <ul className="divide-y divide-grafit-100">
          {aktivitet.map((a, i) => {
            const indhold = (
              <>
                <span className="mt-0.5 text-base" aria-hidden>
                  {IKON[a.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-grafit-800">{tekst(a)}</p>
                  <p className="text-xs text-grafit-400">{relativTid(a.created_at)}</p>
                </div>
              </>
            );
            return (
              <li key={i}>
                {a.href ? (
                  <Link href={a.href} className="flex items-start gap-3 py-2.5 hover:bg-grafit-50">
                    {indhold}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 py-2.5">{indhold}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
