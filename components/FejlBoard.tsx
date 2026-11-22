'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { IssueRow, Model, GarageBil } from '@/lib/types';
import { relativTid } from '@/lib/tid';
import { TYPE_META } from '@/lib/config';
import { StatusTag, SeverityTag, PlatformSignal } from '@/components/Tags';
import ConfirmButton from '@/components/ConfirmButton';

type Sortering = 'stemmer' | 'nyeste';
type TypeFilter = 'alle' | 'fejl' | 'oenske';

export default function FejlBoard({
  issues,
  models,
  userCars,
  myCounts,
  isLoggedIn,
}: {
  issues: IssueRow[];
  models: Model[];
  userCars: GarageBil[];
  myCounts: Record<string, number>;
  isLoggedIn: boolean;
}) {
  const [query, setQuery] = useState('');
  const [modelSlug, setModelSlug] = useState<string | 'alle'>('alle');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('alle');
  const [sort, setSort] = useState<Sortering>('stemmer');

  const antalFejl = useMemo(() => issues.filter((i) => i.type === 'fejl').length, [issues]);
  const antalOensker = useMemo(() => issues.filter((i) => i.type === 'oenske').length, [issues]);

  const viste = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = issues;
    if (typeFilter !== 'alle') {
      r = r.filter((i) => i.type === typeFilter);
    }
    if (modelSlug !== 'alle') {
      r = r.filter((i) => i.models.some((m) => m.slug === modelSlug));
    }
    if (q) {
      r = r.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          (i.category ?? '').toLowerCase().includes(q),
      );
    }
    return [...r].sort((a, b) =>
      sort === 'nyeste'
        ? b.created_at.localeCompare(a.created_at)
        : b.confirmations - a.confirmations,
    );
  }, [issues, modelSlug, typeFilter, query, sort]);

  return (
    <div>
      {/* Modelfilter */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <FilterChip aktiv={modelSlug === 'alle'} onClick={() => setModelSlug('alle')}>
          Alle modeller
        </FilterChip>
        {models.map((m) => (
          <FilterChip key={m.slug} aktiv={modelSlug === m.slug} onClick={() => setModelSlug(m.slug)}>
            {m.name.replace('Zeekr ', '')}
          </FilterChip>
        ))}
      </div>

      {/* Type-filter: Alle / Fejl / Ønsker */}
      <div className="mb-4 inline-flex gap-1 rounded-lg bg-grafit-100 p-1">
        {([
          { key: 'alle', navn: 'Alle', antal: issues.length },
          { key: 'fejl', navn: 'Fejl', antal: antalFejl },
          { key: 'oenske', navn: 'Ønsker', antal: antalOensker },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              typeFilter === t.key ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'
            }`}
          >
            {t.navn} <span className="font-normal opacity-60">({t.antal})</span>
          </button>
        ))}
      </div>

      {/* Søg + sortering */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg i fejl…"
          className="input sm:max-w-xs"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-grafit-500">
            {viste.length}{' '}
            {typeFilter === 'oenske' ? 'ønsker' : typeFilter === 'fejl' ? 'fejl' : 'meldinger'}
          </span>
          <div className="flex gap-1 rounded-lg bg-grafit-100 p-1">
            <SortKnap aktiv={sort === 'stemmer'} onClick={() => setSort('stemmer')}>
              Flest stemmer
            </SortKnap>
            <SortKnap aktiv={sort === 'nyeste'} onClick={() => setSort('nyeste')}>
              Nyeste
            </SortKnap>
          </div>
        </div>
      </div>

      {/* Liste */}
      {viste.length === 0 ? (
        <div className="kort p-10 text-center">
          <p className="font-semibold text-grafit-700">Ingen meldinger her endnu</p>
          <p className="mt-1 text-sm text-grafit-500">
            {modelSlug === 'alle' && typeFilter === 'alle'
              ? 'Vær den første til at melde ind.'
              : 'Intet matcher filteret endnu - prøv et andet.'}
          </p>
          <Link href="/meld" className="btn-primary mt-4">Meld ind</Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {viste.map((i) => (
            <li key={i.id} className="kort flex items-start gap-4 p-4 sm:p-5">
              <ConfirmButton
                issueId={i.id}
                issueModelIds={i.models.map((m) => m.id)}
                userCars={userCars}
                initialCount={i.confirmations}
                initialMine={myCounts[i.id] ?? 0}
                isLoggedIn={isLoggedIn}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-grafit-900">
                  <Link href={`/melding/${i.id}`} className="hover:text-kobber-700 hover:underline">
                    {i.title}
                  </Link>
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`chip ${TYPE_META[i.type].chip}`}>{TYPE_META[i.type].badge}</span>
                  {i.models.map((m) => (
                    <span key={m.slug} className="chip bg-grafit-100 text-grafit-700">
                      {m.name.replace('Zeekr ', '')}
                    </span>
                  ))}
                  <PlatformSignal platforms={i.models.map((m) => m.platform)} />
                  {i.software_version && (
                    <span className="chip bg-grafit-100 font-mono text-grafit-600">{i.software_version}</span>
                  )}
                  {i.type === 'fejl' && <SeverityTag severity={i.severity} />}
                  {(i.status === 'sendt_til_zeekr' || i.status === 'loest_i_ota' || i.status === 'bekraeftet') && (
                    <StatusTag status={i.status} />
                  )}
                  <span className="text-grafit-400">· {relativTid(i.created_at)}</span>
                  {i.comments > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-kobber-50 px-2 py-0.5 font-semibold text-kobber-700">
                      💬 {i.comments} svar
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/melding/${i.id}`}
                className="btn-ghost shrink-0 self-start !px-3 !py-1.5 text-sm"
              >
                Detaljer →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        aktiv ? 'bg-grafit-900 text-white' : 'bg-grafit-100 text-grafit-600 hover:bg-grafit-200'
      }`}
    >
      {children}
    </button>
  );
}

function SortKnap({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
        aktiv ? 'bg-white text-grafit-900 shadow-sm' : 'text-grafit-500'
      }`}
    >
      {children}
    </button>
  );
}
