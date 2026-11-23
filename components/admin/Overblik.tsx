import Link from 'next/link';
import type { AdminStats, ForumOverblik } from '@/lib/queries-admin';

function Tile({ tal, label }: { tal: number; label: string }) {
  return (
    <div className="rounded-xl border border-grafit-200 bg-white px-4 py-4 text-center">
      <div className="text-2xl font-semibold tabular-nums text-grafit-900">{tal}</div>
      <div className="mt-0.5 text-xs font-medium text-grafit-500">{label}</div>
    </div>
  );
}

function OmraadeOverskrift({ titel, href, aabnLabel }: { titel: string; href: string; aabnLabel: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-grafit-400">{titel}</h3>
      <Link href={href} className="text-sm text-kobber-700 hover:underline">
        {aabnLabel} →
      </Link>
    </div>
  );
}

export default function Overblik({ stats, forum }: { stats: AdminStats; forum: ForumOverblik }) {
  const aabne = stats.perStatus.ny + stats.perStatus.bekraeftet;

  return (
    <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-grafit-900">Overblik</h2>

      <OmraadeOverskrift titel="Feedback" href="/admin/feedback" aabnLabel="Åbn Feedback" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile tal={stats.meldinger} label="Meldinger i alt" />
        <Tile tal={stats.bekraeftelser} label="Bekræftelser i alt" />
        <Tile tal={aabne} label="Åbne (ny + bekræftet)" />
        <Tile tal={stats.perStatus.loest_i_ota} label="Løst i OTA" />
      </div>

      <div className="mt-5">
        <OmraadeOverskrift titel="Forum" href="/admin/forum" aabnLabel="Åbn Forum" />
        <div className="grid grid-cols-3 gap-3">
          <Tile tal={forum.kategorier} label="Kategorier" />
          <Tile tal={forum.traade} label="Tråde" />
          <Tile tal={forum.indlaeg} label="Indlæg" />
        </div>
      </div>
    </section>
  );
}
