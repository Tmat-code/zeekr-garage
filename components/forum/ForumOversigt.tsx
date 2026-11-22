'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { relativTid } from '@/lib/tid';
import { modelBadge } from '@/lib/model-badge';
import type { ForumGruppe } from '@/lib/types';

// Kort undertekst pr. gruppe (Polestar har gruppe-overskrift + undertekst).
const GRUPPE_TEKST: Record<string, string> = {
  Velkommen: 'Start her - sig hej og læs husreglerne.',
  Modellerne: 'Ét forum pr. model - rygraden i fællesskabet.',
  'Ejer-lounge': 'Livet som ejer: køb, test, billeder.',
  Teknik: 'Software, opladning, tilbehør og app.',
};

function KategoriRaekke({
  slug,
  icon,
  modelId,
  name,
  description,
  traade,
  visninger,
  sidstAktiv,
  isLocked,
}: {
  slug: string;
  icon: string | null;
  modelId: string | null;
  name: string;
  description: string | null;
  traade: number;
  visninger: number;
  sidstAktiv: string | null;
  isLocked: boolean;
}) {
  const badge = modelId ? modelBadge(slug) : null;
  return (
    <Link
      href={`/forum/${slug}`}
      className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-grafit-50"
    >
      {badge ? (
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grafit-100 font-display text-[13px] font-semibold tabular-nums tracking-tight text-kobber-700"
          aria-hidden="true"
        >
          {badge}
        </span>
      ) : (
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-grafit-100 text-lg"
          aria-hidden="true"
        >
          {icon ?? '💬'}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-grafit-900">{name}</span>
          {isLocked && (
            <span className="shrink-0 text-xs text-grafit-400" title="Kun moderatorer opretter tråde her">
              🔒
            </span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 line-clamp-1 text-sm text-grafit-500">{description}</p>
        )}
      </div>

      {/* Tal: skjul på de mindste skærme, vis fra sm */}
      <div className="hidden shrink-0 items-center gap-6 text-right text-sm sm:flex">
        <div className="w-14">
          <div className="font-semibold tabular-nums text-grafit-800">{traade}</div>
          <div className="text-xs text-grafit-400">{traade === 1 ? 'tråd' : 'tråde'}</div>
        </div>
        <div className="w-16">
          <div className="font-semibold tabular-nums text-grafit-800">{visninger}</div>
          <div className="text-xs text-grafit-400">visninger</div>
        </div>
        <div className="w-24 text-grafit-500">
          {sidstAktiv ? relativTid(sidstAktiv) : '-'}
        </div>
      </div>

      {/* Kompakt tal på mobil */}
      <div className="shrink-0 text-right text-xs text-grafit-400 sm:hidden">
        <div className="font-semibold tabular-nums text-grafit-700">{traade}</div>
        <div>{sidstAktiv ? relativTid(sidstAktiv) : 'ny'}</div>
      </div>
    </Link>
  );
}

export default function ForumOversigt({ grupper }: { grupper: ForumGruppe[] }) {
  const [q, setQ] = useState('');

  const filtreret = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return grupper;
    return grupper
      .map((g) => ({
        ...g,
        kategorier: g.kategorier.filter(
          (k) =>
            k.name.toLowerCase().includes(s) ||
            (k.description ?? '').toLowerCase().includes(s),
        ),
      }))
      .filter((g) => g.kategorier.length > 0);
  }, [q, grupper]);

  return (
    <div>
      {/* Top-bar: søg i kategorier (tråd-søgning kommer senere) */}
      <div className="mb-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find en kategori…"
          className="input"
          aria-label="Find en kategori"
        />
      </div>

      {filtreret.length === 0 ? (
        <p className="py-8 text-center text-grafit-500">Ingen kategorier matcher “{q}”.</p>
      ) : (
        <div className="space-y-8">
          {filtreret.map((g) => (
            <section key={g.label}>
              <div className="mb-2 px-1">
                <h2 className="font-display text-lg font-bold tracking-tight text-grafit-900">
                  {g.label}
                </h2>
                {GRUPPE_TEKST[g.label] && (
                  <p className="text-sm text-grafit-500">{GRUPPE_TEKST[g.label]}</p>
                )}
              </div>
              <div className="divide-y divide-grafit-100 overflow-hidden rounded-2xl border border-grafit-200 bg-white">
                {g.kategorier.map((k) => (
                  <KategoriRaekke
                    key={k.id}
                    slug={k.slug}
                    icon={k.icon}
                    modelId={k.modelId}
                    name={k.name}
                    description={k.description}
                    traade={k.traade}
                    visninger={k.visninger}
                    sidstAktiv={k.sidstAktiv}
                    isLocked={k.isLocked}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
