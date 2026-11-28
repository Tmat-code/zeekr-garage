import Link from 'next/link';
import type { AdminStats, ForumOverblik } from '@/lib/queries-admin';
import type { VOrdbog } from '@/lib/i18n/vaerksted';

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

export default function Overblik({
  v,
  stats,
  forum,
}: {
  v: VOrdbog;
  stats: AdminStats;
  forum: ForumOverblik;
}) {
  const o = v.overblik;
  const aabne = stats.perStatus.ny + stats.perStatus.bekraeftet;

  return (
    <section className="rounded-2xl border-2 border-kobber-200 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-grafit-900">{o.titel}</h2>

      <OmraadeOverskrift
        titel={v.nav.feedback}
        href="/admin/feedback"
        aabnLabel={o.aabn(v.nav.feedback)}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile tal={stats.meldinger} label={o.meldinger} />
        <Tile tal={stats.bekraeftelser} label={o.bekraeftelser} />
        <Tile tal={aabne} label={o.aabne} />
        <Tile tal={stats.perStatus.loest_i_ota} label={o.loestIOta} />
      </div>

      <div className="mt-5">
        <OmraadeOverskrift titel={v.nav.forum} href="/admin/forum" aabnLabel={o.aabn(v.nav.forum)} />
        <div className="grid grid-cols-3 gap-3">
          <Tile tal={forum.kategorier} label={o.kategorier} />
          <Tile tal={forum.traade} label={o.traade} />
          <Tile tal={forum.indlaeg} label={o.indlaeg} />
        </div>
      </div>
    </section>
  );
}
